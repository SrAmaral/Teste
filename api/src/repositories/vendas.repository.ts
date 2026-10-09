import type { Venda } from '@safra/shared';
import { paraIsoUtc } from '../datas';
import type { DB } from '../db/connection';

interface VendaLinha {
  id: number;
  carteira_id: number;
  acao_id: number;
  ticker: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  custo: number;
  resultado: number;
  data: string;
}

export class VendasRepository {
  constructor(private readonly db: DB) {}

  inserir(d: { carteiraId: number; acaoId: number; quantidade: number; precoUnitario: number; total: number; custo: number; resultado: number }): Venda {
    const { lastInsertRowid } = this.db
      .prepare(
        'INSERT INTO vendas (carteira_id, acao_id, quantidade, preco_unitario, total, custo, resultado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(d.carteiraId, d.acaoId, d.quantidade, d.precoUnitario, d.total, d.custo, d.resultado);
    const l = this.db
      .prepare('SELECT v.*, a.ticker FROM vendas v JOIN acoes a ON a.id = v.acao_id WHERE v.id = ?')
      .get(Number(lastInsertRowid)) as VendaLinha;
    return {
      id: l.id,
      carteiraId: l.carteira_id,
      acaoId: l.acao_id,
      ticker: l.ticker,
      quantidade: l.quantidade,
      precoUnitario: l.preco_unitario,
      total: l.total,
      custo: l.custo,
      resultado: l.resultado,
      data: paraIsoUtc(l.data),
    };
  }

  somarResultado(carteiraId?: number): number {
    return (
      this.db.prepare('SELECT COALESCE(SUM(resultado), 0) AS s FROM vendas WHERE (@c IS NULL OR carteira_id = @c)').get({ c: carteiraId ?? null }) as {
        s: number;
      }
    ).s;
  }
}
