import type { DB } from './connection';

export function aplicarSchema(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS carteiras (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT    NOT NULL UNIQUE,
      descricao  TEXT,
      saldo      REAL    NOT NULL DEFAULT 0 CHECK (saldo >= 0),
      criado_em  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS acoes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker        TEXT    NOT NULL UNIQUE,
      nome          TEXT    NOT NULL,
      setor         TEXT,
      preco         REAL    NOT NULL CHECK (preco > 0),
      atualizado_em TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS compras (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      carteira_id    INTEGER NOT NULL REFERENCES carteiras(id),
      acao_id        INTEGER NOT NULL REFERENCES acoes(id),
      quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
      preco_unitario REAL    NOT NULL,
      total          REAL    NOT NULL,
      data           TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_compras_carteira ON compras(carteira_id);
    CREATE INDEX IF NOT EXISTS idx_compras_acao ON compras(acao_id);
  `);
}
