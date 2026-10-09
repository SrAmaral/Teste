import type { Compra, Posicao } from '@safra/shared';
import type { DB } from '../db/connection';
import { arredondar } from '../dinheiro';

interface CompraLinha {
  id: number;
  carteira_id: number;
  acao_id: number;
  ticker: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  data: string;
}

interface PosicaoLinha {
  acao_id: number;
  ticker: string;
  nome: string;
  preco_atual: number;
  quantidade: number;
  valor_investido: number;
}

const SELECT_COMPRA = `
  SELECT co.id, co.carteira_id, co.acao_id, a.ticker, co.quantidade, co.preco_unitario, co.total, co.data
    FROM compras co
    JOIN acoes a ON a.id = co.acao_id`;

const paraCompra = (l: CompraLinha): Compra => ({
  id: l.id,
  carteiraId: l.carteira_id,
  acaoId: l.acao_id,
  ticker: l.ticker,
  quantidade: l.quantidade,
  precoUnitario: l.preco_unitario,
  total: l.total,
  data: l.data,
});

export class ComprasRepository {
  constructor(private readonly db: DB) {}

  inserir(d: { carteiraId: number; acaoId: number; quantidade: number; precoUnitario: number; total: number }): Compra {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO compras (carteira_id, acao_id, quantidade, preco_unitario, total) VALUES (?, ?, ?, ?, ?)')
      .run(d.carteiraId, d.acaoId, d.quantidade, d.precoUnitario, d.total);
    return paraCompra(this.db.prepare(`${SELECT_COMPRA} WHERE co.id = ?`).get(Number(lastInsertRowid)) as CompraLinha);
  }

  listar(carteiraId?: number): Compra[] {
    const linhas =
      carteiraId === undefined
        ? (this.db.prepare(`${SELECT_COMPRA} ORDER BY co.data DESC, co.id DESC`).all() as CompraLinha[])
        : (this.db.prepare(`${SELECT_COMPRA} WHERE co.carteira_id = ? ORDER BY co.data DESC, co.id DESC`).all(carteiraId) as CompraLinha[]);
    return linhas.map(paraCompra);
  }

  posicoes(carteiraId: number): Posicao[] {
    const linhas = this.db
      .prepare(
        `SELECT a.id AS acao_id, a.ticker, a.nome, a.preco AS preco_atual,
                SUM(co.quantidade) AS quantidade, SUM(co.total) AS valor_investido
           FROM compras co
           JOIN acoes a ON a.id = co.acao_id
          WHERE co.carteira_id = ?
          GROUP BY a.id
          ORDER BY a.ticker`,
      )
      .all(carteiraId) as PosicaoLinha[];
    return linhas.map((l) => ({
      acaoId: l.acao_id,
      ticker: l.ticker,
      nome: l.nome,
      quantidade: l.quantidade,
      precoMedio: arredondar(l.valor_investido / l.quantidade),
      precoAtual: l.preco_atual,
      valorInvestido: arredondar(l.valor_investido),
      valorAtual: arredondar(l.quantidade * l.preco_atual),
    }));
  }
}
