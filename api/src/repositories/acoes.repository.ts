import type { Acao } from '@safra/shared';
import { paraIsoUtc } from '../datas';
import type { DB } from '../db/connection';
import type { AcaoInput, AtualizaAcaoInput } from '../schemas/acoes';

interface AcaoLinha {
  id: number;
  ticker: string;
  nome: string;
  setor: string | null;
  preco: number;
  atualizado_em: string;
}

const paraAcao = (l: AcaoLinha): Acao => ({
  id: l.id,
  ticker: l.ticker,
  nome: l.nome,
  setor: l.setor,
  preco: l.preco,
  atualizadoEm: paraIsoUtc(l.atualizado_em),
});

export class AcoesRepository {
  constructor(private readonly db: DB) {}

  listar(ticker?: string): Acao[] {
    const linhas = ticker
      ? (this.db.prepare(`SELECT * FROM acoes WHERE ticker LIKE '%' || ? || '%' ORDER BY ticker`).all(ticker.toUpperCase()) as AcaoLinha[])
      : (this.db.prepare('SELECT * FROM acoes ORDER BY ticker').all() as AcaoLinha[]);
    return linhas.map(paraAcao);
  }

  buscar(id: number): Acao | undefined {
    const linha = this.db.prepare('SELECT * FROM acoes WHERE id = ?').get(id) as AcaoLinha | undefined;
    return linha && paraAcao(linha);
  }

  inserir(d: AcaoInput): Acao {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO acoes (ticker, nome, setor, preco) VALUES (?, ?, ?, ?)')
      .run(d.ticker, d.nome, d.setor ?? null, d.preco);
    return this.buscar(Number(lastInsertRowid))!;
  }

  atualizar(id: number, d: AtualizaAcaoInput): void {
    this.db
      .prepare(
        `UPDATE acoes SET ticker = @ticker, nome = @nome, setor = @setor, preco = COALESCE(@preco, preco), atualizado_em = datetime('now') WHERE id = @id`,
      )
      .run({ id, ticker: d.ticker, nome: d.nome, setor: d.setor ?? null, preco: d.preco ?? null });
  }

  excluir(id: number): void {
    this.db.prepare('DELETE FROM acoes WHERE id = ?').run(id);
  }

  contarCompras(id: number): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM compras WHERE acao_id = ?').get(id) as { n: number }).n;
  }
}
