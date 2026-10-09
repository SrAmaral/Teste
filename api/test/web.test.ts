import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { criarApp } from '../src/app';
import { abrirBanco } from '../src/db/connection';

function pastaWeb() {
  const raiz = mkdtempSync(join(tmpdir(), 'safra-web-'));
  for (const app of ['shell', 'mfe-carteiras', 'mfe-acoes']) {
    mkdirSync(join(raiz, app));
    writeFileSync(join(raiz, app, 'index.html'), `<p>${app}</p>`);
    writeFileSync(join(raiz, app, 'remoteEntry.json'), `{"name":"${app}"}`);
  }
  return raiz;
}

describe('front-ends servidos pela API (produção)', () => {
  const api = request(criarApp(abrirBanco(':memory:'), { pastaWeb: pastaWeb() }));

  it('serve o shell na raiz e o remoteEntry de cada MFE na sua subpasta', async () => {
    expect((await api.get('/')).text).toBe('<p>shell</p>');
    const entry = await api.get('/mfe-acoes/remoteEntry.json');
    expect(entry.body).toEqual({ name: 'mfe-acoes' });
    expect(entry.headers['cache-control']).toBe('no-cache');
  });

  it('devolve o index do shell para rotas do Angular (deep link)', async () => {
    expect((await api.get('/carteiras/1')).text).toBe('<p>shell</p>');
  });

  it('não mascara arquivo inexistente nem rota da API inexistente', async () => {
    expect((await api.get('/mfe-acoes/nao-existe.js')).status).toBe(404);
    const rotaApi = await api.get('/api/nao-existe');
    expect(rotaApi.status).toBe(404);
    expect(rotaApi.body.code).toBe('NAO_ENCONTRADO');
  });

  it('continua respondendo a API', async () => {
    expect((await api.get('/api/health')).body).toEqual({ status: 'ok' });
  });
});
