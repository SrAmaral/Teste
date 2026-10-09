import { describe, expect, it } from 'vitest';
import { novaApi } from './helpers';

const PETR4 = { ticker: 'PETR4', nome: 'Petrobras PN', setor: 'Petróleo e Gás', preco: 38.42 };

describe('ações', () => {
  it('cria ação', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/acoes').send(PETR4);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: expect.any(Number), ...PETR4, atualizadoEm: expect.any(String) });
  });

  it('normaliza ticker com espaços e minúsculas', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/acoes').send({ ...PETR4, ticker: '  petr4 ' });
    expect(res.status).toBe(201);
    expect(res.body.ticker).toBe('PETR4');
  });

  it('ticker normalizado conta como duplicado', async () => {
    const { api } = novaApi();
    await api.post('/api/acoes').send(PETR4);
    const res = await api.post('/api/acoes').send({ ...PETR4, ticker: 'petr4' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICADO');
  });

  it('rejeita ticker fora do padrão e preço não positivo', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/acoes').send({ ...PETR4, ticker: 'PETRO', preco: 0 });
    expect(res.status).toBe(400);
    const campos = res.body.details.map((d: { campo: string }) => d.campo);
    expect(campos).toEqual(expect.arrayContaining(['ticker', 'preco']));
  });

  it('lista ordenado por ticker e filtra por trecho do ticker', async () => {
    const { api } = novaApi();
    await api.post('/api/acoes').send({ ...PETR4, ticker: 'VALE3', nome: 'Vale ON' });
    await api.post('/api/acoes').send(PETR4);
    expect((await api.get('/api/acoes')).body.map((a: { ticker: string }) => a.ticker)).toEqual(['PETR4', 'VALE3']);
    expect((await api.get('/api/acoes?ticker=pe')).body.map((a: { ticker: string }) => a.ticker)).toEqual(['PETR4']);
  });

  it('atualiza preço', async () => {
    const { api } = novaApi();
    const { body } = await api.post('/api/acoes').send(PETR4);
    const res = await api.put(`/api/acoes/${body.id}`).send({ ...PETR4, preco: 40 });
    expect(res.status).toBe(200);
    expect(res.body.preco).toBe(40);
  });

  it('404 para ação inexistente', async () => {
    const { api } = novaApi();
    const res = await api.get('/api/acoes/999');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Ação não encontrada');
  });

  it('exclui ação sem compras', async () => {
    const { api } = novaApi();
    const { body } = await api.post('/api/acoes').send(PETR4);
    expect((await api.delete(`/api/acoes/${body.id}`)).status).toBe(204);
    expect((await api.get(`/api/acoes/${body.id}`)).status).toBe(404);
  });
});
