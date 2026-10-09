import { describe, expect, it } from 'vitest';
import { novaApi } from './helpers';

async function cenario() {
  const contexto = novaApi();
  const { api } = contexto;
  const a = (await api.post('/api/carteiras').send({ nome: 'A', saldoInicial: 1000 })).body;
  const b = (await api.post('/api/carteiras').send({ nome: 'B', saldoInicial: 1000 })).body;
  const petr = (await api.post('/api/acoes').send({ ticker: 'PETR4', nome: 'Petrobras', preco: 10 })).body;
  await api.post(`/api/carteiras/${a.id}/deposito`).send({ valor: 500 });
  await api.post('/api/compras').send({ carteiraId: a.id, acaoId: petr.id, quantidade: 2 });
  await api.post('/api/vendas').send({ carteiraId: a.id, acaoId: petr.id, quantidade: 1 });
  await api.post('/api/compras').send({ carteiraId: b.id, acaoId: petr.id, quantidade: 3 });
  return { ...contexto, a, b };
}

describe('extrato', () => {
  it('lista todas as movimentações com ids prefixados, sinal e datas ISO', async () => {
    const { api } = await cenario();
    const res = await api.get('/api/extrato');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 4, pagina: 1, tamanho: 20 });
    const porTipo = Object.fromEntries(res.body.itens.map((m: { tipo: string; id: string }) => [m.id[0], m.tipo]));
    expect(porTipo).toEqual({ D: 'DEPOSITO', C: 'COMPRA', V: 'VENDA' });
    const valores = res.body.itens.map((m: { valor: number }) => m.valor).sort((x: number, y: number) => x - y);
    expect(valores).toEqual([-30, -20, 10, 500]);
    expect(res.body.itens[0].data).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('filtra por carteira, tipo e ticker', async () => {
    const { api, a } = await cenario();
    const daA = (await api.get(`/api/extrato?carteiraId=${a.id}`)).body;
    expect(daA.total).toBe(3);
    expect(new Set(daA.itens.map((m: { carteiraNome: string }) => m.carteiraNome))).toEqual(new Set(['A']));
    expect((await api.get('/api/extrato?tipo=COMPRA')).body.total).toBe(2);
    expect((await api.get('/api/extrato?ticker=pet')).body.total).toBe(3);
  });

  it('ordena por valor e pagina', async () => {
    const { api } = await cenario();
    const asc = (await api.get('/api/extrato?ordem=valor&direcao=asc')).body.itens;
    expect(asc[0].valor).toBe(-30);
    const pagina2 = (await api.get('/api/extrato?ordem=valor&direcao=asc&tamanho=3&pagina=2')).body;
    expect(pagina2).toMatchObject({ total: 4, pagina: 2, tamanho: 3 });
    expect(pagina2.itens.map((m: { valor: number }) => m.valor)).toEqual([500]);
  });

  it('filtra por período (datas inclusivas)', async () => {
    const { db, api } = await cenario();
    db.prepare("UPDATE compras SET data = '2026-01-15 10:00:00'").run();
    const res = (await api.get('/api/extrato?de=2026-01-01&ate=2026-01-31')).body;
    expect(res.total).toBe(2);
    expect(res.itens.every((m: { tipo: string }) => m.tipo === 'COMPRA')).toBe(true);
  });

  it.each([
    ['tipo=XYZ'],
    ['ordem=preco;DROP TABLE vendas'],
    ['tamanho=500'],
    ['pagina=0'],
    ['de=2026-13-45x'],
  ])('rejeita parâmetro inválido: %s', async (query) => {
    const { api } = await cenario();
    const res = await api.get(`/api/extrato?${query}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDACAO');
  });
});
