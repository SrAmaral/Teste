import { describe, expect, it, vi } from 'vitest';
import { abrirBanco } from '../src/db/connection';
import { AcoesRepository } from '../src/repositories/acoes.repository';
import { CarteirasRepository } from '../src/repositories/carteiras.repository';
import { ComprasRepository } from '../src/repositories/compras.repository';
import { ComprasService } from '../src/services/compras.service';
import { novaApi } from './helpers';

type Api = ReturnType<typeof novaApi>['api'];

async function preparar(api: Api, saldo: number, preco: number) {
  const carteira = (await api.post('/api/carteiras').send({ nome: 'Teste', saldoInicial: saldo })).body;
  const acao = (await api.post('/api/acoes').send({ ticker: 'PETR4', nome: 'Petrobras PN', preco })).body;
  return { carteira, acao };
}

describe('compras', () => {
  it('compra debita saldo e retorna a compra', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 1000, 38.42);
    const res = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 10 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      compra: expect.objectContaining({ carteiraId: carteira.id, acaoId: acao.id, ticker: 'PETR4', quantidade: 10, precoUnitario: 38.42, total: 384.2 }),
      saldoRestante: 615.8,
    });
    expect((await api.get(`/api/carteiras/${carteira.id}`)).body.saldo).toBe(615.8);
  });

  it('posição aparece na carteira e no resumo', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 1000, 10);
    await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 5 });
    const posicoes = (await api.get(`/api/carteiras/${carteira.id}/posicoes`)).body;
    expect(posicoes).toEqual([
      { acaoId: acao.id, ticker: 'PETR4', nome: 'Petrobras PN', setor: null, quantidade: 5, precoMedio: 10, precoAtual: 10, valorInvestido: 50, valorAtual: 50, resultado: 0, resultadoPercentual: 0 },
    ]);
    const resumo = (await api.get('/api/carteiras')).body[0];
    expect(resumo).toMatchObject({ valorInvestido: 50, qtdAtivos: 1 });
  });

  it('preço médio é ponderado entre compras a preços diferentes', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 1000, 10);
    await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 10 });
    await api.put(`/api/acoes/${acao.id}`).send({ ticker: 'PETR4', nome: 'Petrobras PN', preco: 20 });
    await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 10 });
    const [posicao] = (await api.get(`/api/carteiras/${carteira.id}/posicoes`)).body;
    expect(posicao).toMatchObject({ quantidade: 20, precoMedio: 15, precoAtual: 20, valorInvestido: 300, valorAtual: 400 });
  });

  it('saldo insuficiente retorna 422 e não altera nada', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 100, 38.42);
    const res = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 3 });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'SALDO_INSUFICIENTE', details: { necessario: 115.26, disponivel: 100 } });
    expect((await api.get(`/api/carteiras/${carteira.id}`)).body.saldo).toBe(100);
    expect((await api.get(`/api/compras?carteiraId=${carteira.id}`)).body).toEqual([]);
  });

  it('arredonda centavos: 3 × 33,33 com saldo 100 deixa 0,01', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 100, 33.33);
    const res = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 3 });
    expect(res.status).toBe(201);
    expect(res.body.compra.total).toBe(99.99);
    expect(res.body.saldoRestante).toBe(0.01);
  });

  it('aceita compra exatamente igual ao saldo', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 99.99, 33.33);
    const res = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 3 });
    expect(res.status).toBe(201);
    expect(res.body.saldoRestante).toBe(0);
  });

  it('rejeita quantidade fracionada ou zero', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 1000, 10);
    expect((await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 1.5 })).status).toBe(400);
    expect((await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 0 })).status).toBe(400);
  });

  it('404 para carteira ou ação inexistente', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 1000, 10);
    const semCarteira = await api.post('/api/compras').send({ carteiraId: 999, acaoId: acao.id, quantidade: 1 });
    expect(semCarteira.status).toBe(404);
    expect(semCarteira.body.message).toBe('Carteira não encontrada');
    const semAcao = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: 999, quantidade: 1 });
    expect(semAcao.status).toBe(404);
    expect(semAcao.body.message).toBe('Ação não encontrada');
  });

  it('bloqueia exclusão de carteira e ação com compras', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 1000, 10);
    await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 1 });
    const delCarteira = await api.delete(`/api/carteiras/${carteira.id}`);
    expect(delCarteira.status).toBe(409);
    expect(delCarteira.body.code).toBe('CARTEIRA_COM_COMPRAS');
    const delAcao = await api.delete(`/api/acoes/${acao.id}`);
    expect(delAcao.status).toBe(409);
    expect(delAcao.body.code).toBe('ACAO_COM_COMPRAS');
  });

  it('lista compras filtrando por carteira, mais recentes primeiro', async () => {
    const { api } = novaApi();
    const { carteira, acao } = await preparar(api, 1000, 10);
    const outra = (await api.post('/api/carteiras').send({ nome: 'Outra', saldoInicial: 1000 })).body;
    await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 1 });
    await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 2 });
    await api.post('/api/compras').send({ carteiraId: outra.id, acaoId: acao.id, quantidade: 3 });
    const res = await api.get(`/api/compras?carteiraId=${carteira.id}`);
    expect(res.body.map((c: { quantidade: number }) => c.quantidade)).toEqual([2, 1]);
    expect((await api.get('/api/compras')).body).toHaveLength(3);
  });

  it('posições de carteira inexistente retornam 404', async () => {
    const { api } = novaApi();
    expect((await api.get('/api/carteiras/999/posicoes')).status).toBe(404);
  });

  it('reverte o débito se a inserção da compra falhar (transação)', () => {
    const db = abrirBanco(':memory:');
    const carteiras = new CarteirasRepository(db);
    const acoes = new AcoesRepository(db);
    const compras = new ComprasRepository(db);
    const carteira = carteiras.inserir({ nome: 'Atômica', descricao: null, saldo: 1000 });
    const acao = acoes.inserir({ ticker: 'VALE3', nome: 'Vale ON', setor: null, preco: 50 });
    vi.spyOn(compras, 'inserir').mockImplementation(() => {
      throw new Error('falha simulada');
    });
    const servico = new ComprasService(db, carteiras, acoes, compras);
    expect(() => servico.comprar({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 2 })).toThrow('falha simulada');
    expect(carteiras.buscar(carteira.id)!.saldo).toBe(1000);
  });
});
