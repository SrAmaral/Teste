import type { Compra, Posicao } from '@safra/shared';
import type { DB } from '../db/connection';
import { paraIsoUtc } from '../datas';
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
  setor: string | null;
  preco_atual: number;
  quantidade: number;
  custo: number;
}

/** Posição líquida por (carteira, ação): compras − vendas; o custo restante segue o método do custo médio. */
const POSICOES_SQL = `
  WITH c AS (
    SELECT carteira_id, acao_id, SUM(quantidade) AS q, SUM(total) AS custo
      FROM compras WHERE (@carteira IS NULL OR carteira_id = @carteira) GROUP BY carteira_id, acao_id
  ), v AS (
    SELECT carteira_id, acao_id, SUM(quantidade) AS q, SUM(custo) AS custo
      FROM vendas WHERE (@carteira IS NULL OR carteira_id = @carteira) GROUP BY carteira_id, acao_id
  ), p AS (
    SELECT c.acao_id, SUM(c.q - COALESCE(v.q, 0)) AS quantidade, SUM(c.custo - COALESCE(v.custo, 0)) AS custo
      FROM c LEFT JOIN v ON v.carteira_id = c.carteira_id AND v.acao_id = c.acao_id
     WHERE c.q - COALESCE(v.q, 0) > 0
     GROUP BY c.acao_id
  )
  SELECT a.id AS acao_id, a.ticker, a.nome, a.setor, a.preco AS preco_atual, p.quantidade, p.custo
    FROM p JOIN acoes a ON a.id = p.acao_id
   ORDER BY a.ticker`;

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
  data: paraIsoUtc(l.data),
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

  posicoes(carteiraId?: number): Posicao[] {
    const linhas = this.db.prepare(POSICOES_SQL).all({ carteira: carteiraId ?? null }) as PosicaoLinha[];
    return linhas.map((l) => {
      const valorInvestido = arredondar(l.custo);
      const valorAtual = arredondar(l.quantidade * l.preco_atual);
      const resultado = arredondar(valorAtual - valorInvestido);
      return {
        acaoId: l.acao_id,
        ticker: l.ticker,
        nome: l.nome,
        setor: l.setor,
        quantidade: l.quantidade,
        precoMedio: arredondar(l.custo / l.quantidade),
        precoAtual: l.preco_atual,
        valorInvestido,
        valorAtual,
        resultado,
        resultadoPercentual: valorInvestido > 0 ? arredondar((resultado / valorInvestido) * 100) : 0,
      };
    });
  }

  posicao(carteiraId: number, acaoId: number): { quantidade: number; custo: number } {
    const linha = this.db
      .prepare(
        `SELECT
           COALESCE((SELECT SUM(quantidade) FROM compras WHERE carteira_id = @c AND acao_id = @a), 0)
         - COALESCE((SELECT SUM(quantidade) FROM vendas  WHERE carteira_id = @c AND acao_id = @a), 0) AS quantidade,
           COALESCE((SELECT SUM(total) FROM compras WHERE carteira_id = @c AND acao_id = @a), 0)
         - COALESCE((SELECT SUM(custo) FROM vendas  WHERE carteira_id = @c AND acao_id = @a), 0) AS custo`,
      )
      .get({ c: carteiraId, a: acaoId }) as { quantidade: number; custo: number };
    return { quantidade: linha.quantidade, custo: arredondar(linha.custo) };
  }
}
