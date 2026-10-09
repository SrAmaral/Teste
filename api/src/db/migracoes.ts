import type { DB } from './connection';

type Migracao = (db: DB) => void;

/** Ordem importa: o índice + 1 é a versão gravada em PRAGMA user_version. Nunca editar migrações já publicadas. */
export const MIGRACOES: Migracao[] = [
  // v1 — schema da fase 1 (IF NOT EXISTS adota bancos criados antes do versionamento)
  (db) =>
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
    `),
  // v2 — depósitos e vendas
  (db) =>
    db.exec(`
      CREATE TABLE depositos (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        carteira_id INTEGER NOT NULL REFERENCES carteiras(id),
        valor       REAL    NOT NULL CHECK (valor > 0),
        data        TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE vendas (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        carteira_id    INTEGER NOT NULL REFERENCES carteiras(id),
        acao_id        INTEGER NOT NULL REFERENCES acoes(id),
        quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
        preco_unitario REAL    NOT NULL,
        total          REAL    NOT NULL,
        custo          REAL    NOT NULL,
        resultado      REAL    NOT NULL,
        data           TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_depositos_carteira ON depositos(carteira_id);
      CREATE INDEX idx_vendas_carteira ON vendas(carteira_id);
      CREATE INDEX idx_vendas_acao ON vendas(acao_id);
    `),
];

export function versaoDoBanco(db: DB): number {
  return db.pragma('user_version', { simple: true }) as number;
}

export function aplicarMigracoes(db: DB): void {
  for (let versao = versaoDoBanco(db); versao < MIGRACOES.length; versao++) {
    db.transaction(() => {
      MIGRACOES[versao](db);
      db.pragma(`user_version = ${versao + 1}`);
    })();
  }
}
