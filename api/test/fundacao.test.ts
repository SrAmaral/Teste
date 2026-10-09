import { describe, expect, it } from 'vitest';
import { abrirBanco } from '../src/db/connection';
import { popularSeVazio } from '../src/db/seed';
import { novaApi } from './helpers';

describe('fundação da API', () => {
  it('GET /api/health responde ok', async () => {
    const { api } = novaApi();
    const res = await api.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('rota inexistente retorna 404 padronizado', async () => {
    const { api } = novaApi();
    const res = await api.get('/api/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NAO_ENCONTRADO', message: 'Rota não encontrada' });
  });

  it('JSON malformado retorna 400 JSON_INVALIDO', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/health').set('Content-Type', 'application/json').send('{"nome":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('JSON_INVALIDO');
  });

  it('corpo grande demais retorna 413 e não 500', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/carteiras').set('Content-Type', 'application/json').send(JSON.stringify({ nome: 'x'.repeat(200_000) }));
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('CORPO_MUITO_GRANDE');
  });

  it('charset não suportado retorna 415 e não 500', async () => {
    const { api } = novaApi();
    const res = await api.post('/api/carteiras').set('Content-Type', 'application/json; charset=klingon').send('{"nome":"x"}');
    expect(res.status).toBe(415);
    expect(res.body.code).toBe('REQUISICAO_INVALIDA');
  });

  it('libera CORS para o shell', async () => {
    const { api } = novaApi();
    const res = await api.get('/api/health').set('Origin', 'http://localhost:4200');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('cria as tabelas', () => {
    const { db } = novaApi();
    const tabelas = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name);
    expect(tabelas).toEqual(expect.arrayContaining(['carteiras', 'acoes', 'compras']));
  });

  it('seed popula 8 ações e 2 carteiras apenas uma vez', () => {
    const db = abrirBanco(':memory:', { seed: true });
    popularSeVazio(db);
    const contar = (tabela: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number }).n;
    expect(contar('acoes')).toBe(8);
    expect(contar('carteiras')).toBe(2);
  });
});
