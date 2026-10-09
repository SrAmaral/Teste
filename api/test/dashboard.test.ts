import { describe, expect, it } from 'vitest';
import { novaApi } from './helpers';

async function cenario() {
  const contexto = novaApi();
  const { api } = contexto;
  const carteira = (await api.post('/api/carteiras').send({ nome: 'Principal', saldoInicial: 1000 })).body;
  const itub = (await api.post('/api/acoes').send({ ticker: 'ITUB4', nome: 'Itaú', setor: 'Financeiro', preco: 10 })).body;
  const mglu = (await api.post('/api/acoes').send({ ticker: 'MGLU3', nome: 'Magalu', preco: 20 })).body;
  await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: itub.id, quantidade: 10 });
  await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: mglu.id, quantidade: 5 });
  return { ...contexto, carteira, itub, mglu };
}

describe('dashboard', () => {
  it('soma caixa, valor de mercado e alocação por setor', async () => {
    const { api } = await cenario();
    const res = await api.get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      caixa: 800,
      valorMercado: 200,
      patrimonio: 1000,
      investido: 200,
      resultadoNaoRealizado: 0,
      resultadoRealizado: 0,
    });
    expect(res.body.alocacaoPorSetor).toEqual([
      { nome: 'Financeiro', valor: 100, percentual: 50 },
      { nome: 'Outros', valor: 100, percentual: 50 },
    ]);
    expect(res.body.posicoes).toHaveLength(2);
  });

  it('variação do dia acompanha as cotações e a série termina no patrimônio', async () => {
    const { api, mercado } = await cenario();
    await api.get('/api/dashboard');
    mercado.tick();
    const cotacoes = (await api.get('/api/cotacoes')).body as { ticker: string; preco: number; abertura: number }[];
    const qtd: Record<string, number> = { ITUB4: 10, MGLU3: 5 };
    const esperado = cotacoes.reduce((s, c) => s + qtd[c.ticker] * (c.preco - c.abertura), 0);
    const d = (await api.get('/api/dashboard')).body;
    expect(d.variacaoDia).toBeCloseTo(esperado, 2);
    expect(d.serie.length).toBe(mercado.linhaDoTempo().length);
    expect(d.maioresAltas.length).toBeLessThanOrEqual(3);
  });

  it('separa carteira e consolidado, e inclui resultado realizado', async () => {
    const { api, carteira, itub } = await cenario();
    const outra = (await api.post('/api/carteiras').send({ nome: 'Outra', saldoInicial: 500 })).body;
    await api.post('/api/vendas').send({ carteiraId: carteira.id, acaoId: itub.id, quantidade: 10 });
    await api.put(`/api/acoes/${itub.id}`).send({ ticker: 'ITUB4', nome: 'Itaú', setor: 'Financeiro', preco: 12 });
    expect((await api.get(`/api/dashboard?carteiraId=${outra.id}`)).body).toMatchObject({ caixa: 500, valorMercado: 0 });
    const consolidado = (await api.get('/api/dashboard')).body;
    expect(consolidado.caixa).toBe(1400);
    expect(consolidado.resultadoRealizado).toBe(0);
  });

  it('carteira vazia não gera NaN e carteira inexistente é 404', async () => {
    const { api } = novaApi();
    const vazia = (await api.post('/api/carteiras').send({ nome: 'Vazia', saldoInicial: 100 })).body;
    const d = (await api.get(`/api/dashboard?carteiraId=${vazia.id}`)).body;
    expect(d).toMatchObject({ patrimonio: 100, valorMercado: 0, variacaoDiaPercentual: 0, alocacaoPorSetor: [], alocacaoPorAtivo: [] });
    expect(JSON.stringify(d)).not.toContain('null');
    expect((await api.get('/api/dashboard?carteiraId=999')).status).toBe(404);
  });
});
