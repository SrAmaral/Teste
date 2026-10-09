import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { criarApp } from '../src/app';
import { abrirBanco } from '../src/db/connection';
import { ouvir } from '../src/servidor';

describe('ouvir', () => {
  it('resolve com o servidor ouvindo na porta pedida', async () => {
    const servidor = await ouvir(criarApp(abrirBanco(':memory:')), 0);
    expect((servidor.address() as AddressInfo).port).toBeGreaterThan(0);
    servidor.close();
  });

  it('rejeita com EADDRINUSE quando a porta já está em uso (em vez de anunciar que está ouvindo)', async () => {
    const ocupante = createServer().listen(0);
    await new Promise((resolve) => ocupante.once('listening', resolve));
    const porta = (ocupante.address() as AddressInfo).port;
    await expect(ouvir(criarApp(abrirBanco(':memory:')), porta)).rejects.toMatchObject({ code: 'EADDRINUSE' });
    ocupante.close();
  });
});
