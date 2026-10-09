import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'docs');
const destino = join(raiz, 'apps', 'shell', 'public', 'docs');

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });
cpSync(origem, destino, { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
console.log(`[sync-docs] ${origem} -> ${destino}`);
