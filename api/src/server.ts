import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarApp } from './app';
import { abrirBanco } from './db/connection';
import { MercadoSimulado } from './mercado/mercado-simulado';
import { ouvir } from './servidor';

// Padrão: api/data/safra.db. No container, SAFRA_DB aponta para o volume (/data/safra.db).
const caminhoBanco = process.env.SAFRA_DB ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'safra.db');
if (caminhoBanco !== ':memory:') mkdirSync(dirname(caminhoBanco), { recursive: true });

const db = abrirBanco(caminhoBanco, { seed: true });
const porta = Number(process.env.PORT ?? 3000);
const mercado = new MercadoSimulado(db);

try {
  const servidor = await ouvir(criarApp(db, { pastaWeb: process.env.SAFRA_WEB, mercado }), porta);
  console.log(`[api] ouvindo em http://localhost:${porta}/api`);
  mercado.iniciar(1000);

  // Encerramento imediato no Ctrl+C: fecha conexões keep-alive (o shell consulta /health a cada 10 s) e o banco.
  for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sinal, () => {
      mercado.parar();
      servidor.closeAllConnections();
      servidor.close();
      db.close();
      process.exit(0);
    });
  }
} catch (erro) {
  const codigo = (erro as NodeJS.ErrnoException).code;
  console.error(
    codigo === 'EADDRINUSE'
      ? `[api] porta ${porta} já está em uso — outra instância da API está rodando? Encerre-a e tente de novo.`
      : '[api] falha ao iniciar o servidor',
    codigo === 'EADDRINUSE' ? '' : erro,
  );
  db.close();
  process.exit(1);
}
