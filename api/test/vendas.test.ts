import { describe, expect, it } from 'vitest';
import { novaApi } from './helpers';

type Api = ReturnType<typeof novaApi>['api'];

async function cenario(api: Api, { saldo = 1000, preco = 10, compra = 10 } = {}) {
  const carteira = (await api.post('/api/carteiras').send({ nome: 'Teste', saldoInicial: saldo })).body;
  const acao = (await api.post('/api/acoes').send({ ticker: 'PETR4', nome: 'Petrobras PN', preco })).body;
  if (compra > 0) await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: compra });
  const mudarPreco = (novo: number) => api.put(`/api/acoes/${acao.id}`).send({ ticker: 'PETR4', nome: 'Petrobras PN', preco: novo });
  return { carteira, acao, mudarPreco };
}

describe('vendas', () => {
  it('venda parcial credita saldo, apura resultado pelo custo médio e preserva o preço médio', async () => {
    const { api } = novaApi();
    const { carteira, acao, mudarPreco } = await cenario(api);
    await mudarPreco(15);
    const res = await api.post('/api/vendas').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 4 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      venda: expect.objectContaining({ ticker: 'PETR4', quantidade: 4, precoUnitario: 15, total: 60, custo: 40, resultado: 20, data: expect.stringMatching(/Z$/) }),
      saldoRestante: 960,
    });
    const [posicao] = (await api.get(`/api/carteiras/${carteira.id}/posicoes`)).body;
    expect(posicao).toMatchObject({ quantidade: 6, precoMedio: 10, valorInvestido: 60, precoAtual: 15, valorAtual: 90, resultado: 30, resultadoPercentual: 50 });
  });

  it('resultado negativo quando vende abaixo do preço médio', async () => {
    const { api } = novaApi();
    const { carteira, acao, mudarPreco } = await cenario(api);
    await mudarPreco(8);
    const res = await api.post('/api/vendas').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 10 });
    expect(res.body.venda.resultado).toBe(-20);
  });

  it('vender a posição inteira zera custo exatamente e a posição some', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await cenario(api, { preco: 33.33, compra: 3 });
    await api.post('/api/vendas').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 1 });
    await api.post('/api/vendas').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 2 });
    expect((await api.get(`/api/carteiras/${carteira.id}/posicoes`)).body).toEqual([]);
    expect((await api.get('/api/carteiras')).body[0]).toMatchObject({ valorInvestido: 0, qtdAtivos: 0 });
  });

  it('recusa vender mais do que a posição (422) sem alterar saldo', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await cenario(api);
    const res = await api.post('/api/vendas').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 11 });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'POSICAO_INSUFICIENTE', details: { disponivel: 10 } });
    expect((await api.get(`/api/carteiras/${carteira.id}`)).body.saldo).toBe(900);
  });

  it('recusa vender ação nunca comprada', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await cenario(api, { compra: 0 });
    const res = await api.post('/api/vendas').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 1 });
    expect(res.status).toBe(422);
    expect(res.body.details).toEqual({ disponivel: 0 });
  });

  it('venda com trava executa no preço travado mesmo se o mercado mudou', async () => {
    const { api } = novaApi();
    const { carteira, acao, mudarPreco } = await cenario(api);
    const trava = (await api.post(`/api/cotacoes/${acao.id}/trava`)).body;
    await mudarPreco(99);
    const res = await api.post('/api/vendas').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 1, travaToken: trava.token });
    expect(res.body.venda.precoUnitario).toBe(10);
  });
});

describe('compras com trava', () => {
  it('executa no preço travado e recusa reutilizar o token (409) sem debitar', async () => {
    const { api } = novaApi();
    const { carteira, acao, mudarPreco } = await cenario(api, { compra: 0 });
    const trava = (await api.post(`/api/cotacoes/${acao.id}/trava`)).body;
    await mudarPreco(50);
    const primeira = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 2, travaToken: trava.token });
    expect(primeira.body.compra.precoUnitario).toBe(10);

    const segunda = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 2, travaToken: trava.token });
    expect(segunda.status).toBe(409);
    expect(segunda.body.code).toBe('COTACAO_EXPIRADA');
    expect((await api.get(`/api/carteiras/${carteira.id}`)).body.saldo).toBe(980);
  });

  it('recusa trava de outra ação', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await cenario(api, { compra: 0 });
    const outra = (await api.post('/api/acoes').send({ ticker: 'VALE3', nome: 'Vale', preco: 5 })).body;
    const trava = (await api.post(`/api/cotacoes/${outra.id}/trava`)).body;
    const res = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 1, travaToken: trava.token });
    expect(res.status).toBe(409);
  });
});
