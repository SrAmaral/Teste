import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { criarApp } from '../src/app';
import { ouvir } from '../src/servidor';
import { novaApi } from './helpers';

async function criarAcao(api: ReturnType<typeof novaApi>['api'], ticker = 'PETR4', preco = 38.42) {
  return (await api.post('/api/acoes').send({ ticker, nome: `${ticker} SA`, preco })).body;
}

describe('cotações', () => {
  it('GET /api/cotacoes devolve a foto atual com histórico', async () => {
    const { api } = novaApi();
    await criarAcao(api);
    const res = await api.get('/api/cotacoes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([expect.objectContaining({ ticker: 'PETR4', preco: 38.42, abertura: 38.42, variacao: 0, historico: [38.42] })]);
  });

  it('POST /trava devolve token com o preço atual e 404 para ação inexistente', async () => {
    const { api } = novaApi();
    const acao = await criarAcao(api);
    const res = await api.post(`/api/cotacoes/${acao.id}/trava`);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ token: expect.any(String), acaoId: acao.id, preco: 38.42, expiraEm: expect.stringMatching(/Z$/) });
    expect((await api.post('/api/cotacoes/999/trava')).status).toBe(404);
  });

  it('stream SSE envia snapshot ao conectar e cotações a cada tick', async () => {
    const { db, mercado, travas, api } = novaApi();
    await criarAcao(api);
    const servidor = await ouvir(criarApp(db, { mercado, travas }), 0);
    const { port } = servidor.address() as AddressInfo;
    const controle = new AbortController();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/cotacoes/stream`, { signal: controle.signal });
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      const leitor = res.body!.getReader();
      const decodificador = new TextDecoder();
      let texto = '';
      const lerAte = async (marcador: string) => {
        while (!texto.includes(marcador)) texto += decodificador.decode((await leitor.read()).value);
      };
      await lerAte('event: snapshot');
      await lerAte('\n\n');
      expect(texto).toContain('"ticker":"PETR4"');
      mercado.tick();
      await lerAte('event: cotacoes');
    } finally {
      controle.abort();
      servidor.closeAllConnections();
      servidor.close();
    }
  });
});
