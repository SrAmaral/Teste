import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarApp } from './app';
import { abrirBanco } from './db/connection';

const pastaDados = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
mkdirSync(pastaDados, { recursive: true });

const db = abrirBanco(process.env.SAFRA_DB ?? join(pastaDados, 'safra.db'), { seed: true });
const porta = Number(process.env.PORT ?? 3000);

criarApp(db).listen(porta, () => {
  console.log(`[api] ouvindo em http://localhost:${porta}/api`);
});
