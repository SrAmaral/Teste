import { describe, expect, it } from 'vitest';
import { novaApi } from './helpers';

describe('carteiras', () => {
  it('cria carteira com saldo inicial', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/carteiras').send({ nome: 'Renda', descricao: 'Dividendos', saldoInicial: 1500 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: expect.any(Number), nome: 'Renda', descricao: 'Dividendos', saldo: 1500 });
    expect(res.body.criadoEm).toEqual(expect.any(String));
  });

  it('saldo inicial padrão é zero', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/carteiras').send({ nome: 'Vazia' });
    expect(res.body.saldo).toBe(0);
  });

  it('rejeita nome duplicado com 409', async () => {
    const { api } = novaApi();
    await api.post('/api/carteiras').send({ nome: 'Renda' });
    const res = await api.post('/api/carteiras').send({ nome: 'Renda' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICADO');
  });

  it('valida nome vazio e saldo negativo', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/carteiras').send({ nome: '   ', saldoInicial: -1 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDACAO');
    const campos = res.body.details.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(['nome', 'saldoInicial']));
  });

  it('lista com resumo ordenado por nome', async () => {
    const { api } = novaApi();
    await api.post('/api/carteiras').send({ nome: 'Zeta' });
    await api.post('/api/carteiras').send({ nome: 'Alfa', saldoInicial: 10 });
    const res = await api.get('/api/carteiras');
    expect(res.status).toBe(200);
    expect(res.body.map((c: { nome: string }) => c.nome)).toEqual(['Alfa', 'Zeta']);
    expect(res.body[0]).toMatchObject({ saldo: 10, valorInvestido: 0, qtdAtivos: 0 });
  });

  it('obtém por id, 404 para inexistente e 400 para id inválido', async () => {
    const { api } = novaApi();
    const { body } = await api.post('/api/carteiras').send({ nome: 'Renda' });
    expect((await api.get(`/api/carteiras/${body.id}`)).body.nome).toBe('Renda');

    const inexistente = await api.get('/api/carteiras/999');
    expect(inexistente.status).toBe(404);
    expect(inexistente.body).toEqual({ code: 'NAO_ENCONTRADO', message: 'Carteira não encontrada' });

    const invalido = await api.get('/api/carteiras/abc');
    expect(invalido.status).toBe(400);
    expect(invalido.body.code).toBe('VALIDACAO');
  });

  it('atualiza nome e descrição sem alterar saldo', async () => {
    const { api } = novaApi();
    const { body } = await api.post('/api/carteiras').send({ nome: 'Renda', saldoInicial: 100 });
    const res = await api.put(`/api/carteiras/${body.id}`).send({ nome: 'Renda Plus', descricao: 'Nova', saldo: 999999 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: 'Renda Plus', descricao: 'Nova', saldo: 100 });
  });

  it('exclui carteira sem compras', async () => {
    const { api } = novaApi();
    const { body } = await api.post('/api/carteiras').send({ nome: 'Temp' });
    expect((await api.delete(`/api/carteiras/${body.id}`)).status).toBe(204);
    expect((await api.get(`/api/carteiras/${body.id}`)).status).toBe(404);
  });

  it('depósito soma ao saldo com arredondamento', async () => {
    const { api } = novaApi();
    const { body } = await api.post('/api/carteiras').send({ nome: 'Renda', saldoInicial: 0.1 });
    const res = await api.post(`/api/carteiras/${body.id}/deposito`).send({ valor: 0.2 });
    expect(res.status).toBe(200);
    expect(res.body.saldo).toBe(0.3);
  });

  it('rejeita depósito zero ou negativo', async () => {
    const { api } = novaApi();
    const { body } = await api.post('/api/carteiras').send({ nome: 'Renda' });
    expect((await api.post(`/api/carteiras/${body.id}/deposito`).send({ valor: 0 })).status).toBe(400);
    expect((await api.post(`/api/carteiras/${body.id}/deposito`).send({ valor: -5 })).status).toBe(400);
  });
});
