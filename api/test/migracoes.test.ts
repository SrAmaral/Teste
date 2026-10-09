import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { aplicarMigracoes, MIGRACOES, versaoDoBanco } from '../src/db/migracoes';
import { novaApi } from './helpers';

const SCHEMA_FASE_1 = `
  CREATE TABLE carteiras (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL UNIQUE, descricao TEXT,
    saldo REAL NOT NULL DEFAULT 0 CHECK (saldo >= 0), criado_em TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE acoes (id INTEGER PRIMARY KEY AUTOINCREMENT, ticker TEXT NOT NULL UNIQUE, nome TEXT NOT NULL, setor TEXT,
    preco REAL NOT NULL CHECK (preco > 0), atualizado_em TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE compras (id INTEGER PRIMARY KEY AUTOINCREMENT, carteira_id INTEGER NOT NULL REFERENCES carteiras(id),
    acao_id INTEGER NOT NULL REFERENCES acoes(id), quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario REAL NOT NULL, total REAL NOT NULL, data TEXT NOT NULL DEFAULT (datetime('now')));`;

const tabelas = (db: Database.Database) =>
  (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name);

describe('migrações', () => {
  it('banco novo fica na última versão com as tabelas da fase 2', () => {
    const { db } = novaApi();
    expect(versaoDoBanco(db)).toBe(MIGRACOES.length);
    expect(tabelas(db)).toEqual(expect.arrayContaining(['carteiras', 'acoes', 'compras', 'depositos', 'vendas']));
  });

  it('adota um banco da fase 1 (versão 0) sem perder dados', () => {
    const db = new Database(':memory:');
    db.exec(SCHEMA_FASE_1);
    db.prepare("INSERT INTO carteiras (nome, saldo) VALUES ('Antiga', 500)").run();
    db.prepare("INSERT INTO acoes (ticker, nome, preco) VALUES ('PETR4', 'Petrobras', 10)").run();
    db.prepare('INSERT INTO compras (carteira_id, acao_id, quantidade, preco_unitario, total) VALUES (1, 1, 5, 10, 50)').run();

    aplicarMigracoes(db);

    expect(versaoDoBanco(db)).toBe(MIGRACOES.length);
    expect(db.prepare('SELECT nome, saldo FROM carteiras').get()).toEqual({ nome: 'Antiga', saldo: 500 });
    expect((db.prepare('SELECT COUNT(*) AS n FROM compras').get() as { n: number }).n).toBe(1);
    expect(tabelas(db)).toEqual(expect.arrayContaining(['depositos', 'vendas']));
  });

  it('é idempotente', () => {
    const { db } = novaApi();
    expect(() => aplicarMigracoes(db)).not.toThrow();
    expect(versaoDoBanco(db)).toBe(MIGRACOES.length);
  });

  it('registra o depósito na tabela depositos', async () => {
    const { db, api } = novaApi();
    const { body } = await api.post('/api/carteiras').send({ nome: 'Renda' });
    await api.post(`/api/carteiras/${body.id}/deposito`).send({ valor: 250.5 });
    expect(db.prepare('SELECT carteira_id AS carteiraId, valor FROM depositos').all()).toEqual([{ carteiraId: body.id, valor: 250.5 }]);
  });
});
