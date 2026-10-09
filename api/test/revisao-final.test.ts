import { describe, expect, it } from 'vitest';
import { novaApi } from './helpers';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

describe('revisão final: valores monetários', () => {
  it('rejeita preço abaixo de um centavo (evita compra de graça)', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/acoes').send({ ticker: 'PETR4', nome: 'Petrobras PN', preco: 0.001 });
    expect(res.status).toBe(400);
  });

  it('rejeita preço com mais de 2 casas decimais', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/acoes').send({ ticker: 'PETR4', nome: 'Petrobras PN', preco: 10.555 });
    expect(res.status).toBe(400);
  });

  it('rejeita depósito abaixo de um centavo ou com mais de 2 casas', async () => {
    const { api } = novaApi();
    const { body } = await api.post('/api/carteiras').send({ nome: 'Renda' });
    expect((await api.post(`/api/carteiras/${body.id}/deposito`).send({ valor: 0.001 })).status).toBe(400);
    expect((await api.post(`/api/carteiras/${body.id}/deposito`).send({ valor: 10.555 })).status).toBe(400);
  });

  it('rejeita saldo inicial com mais de 2 casas', async () => {
    const { api } = novaApi();
    expect((await api.post('/api/carteiras').send({ nome: 'Renda', saldoInicial: 10.555 })).status).toBe(400);
  });

  it('rejeita valores absurdos que levariam o saldo a Infinity', async () => {
    const { api } = novaApi();
    expect((await api.post('/api/carteiras').send({ nome: 'Renda', saldoInicial: 1e308 })).status).toBe(400);
    const { body } = await api.post('/api/carteiras').send({ nome: 'Outra' });
    expect((await api.post(`/api/carteiras/${body.id}/deposito`).send({ valor: 1e308 })).status).toBe(400);
  });
});

describe('revisão final: datas em ISO 8601 UTC', () => {
  it('carteira, ação e compra retornam datas ISO com T e Z', async () => {
    const { api } = novaApi();
    const carteira = (await api.post('/api/carteiras').send({ nome: 'Renda', saldoInicial: 100 })).body;
    const acao = (await api.post('/api/acoes').send({ ticker: 'PETR4', nome: 'Petrobras PN', preco: 10 })).body;
    const { compra } = (await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 1 })).body;
    expect(carteira.criadoEm).toMatch(ISO_UTC);
    expect(acao.atualizadoEm).toMatch(ISO_UTC);
    expect(compra.data).toMatch(ISO_UTC);
    expect((await api.get(`/api/compras?carteiraId=${carteira.id}`)).body[0].data).toMatch(ISO_UTC);
  });
});
