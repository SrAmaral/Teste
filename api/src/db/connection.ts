import Database from 'better-sqlite3';
import { aplicarMigracoes } from './migracoes';
import { popularSeVazio } from './seed';

export type DB = Database.Database;

export function abrirBanco(arquivo: string, opcoes: { seed?: boolean } = {}): DB {
  const db = new Database(arquivo);
  if (arquivo !== ':memory:') db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  aplicarMigracoes(db);
  if (opcoes.seed) popularSeVazio(db);
  return db;
}
