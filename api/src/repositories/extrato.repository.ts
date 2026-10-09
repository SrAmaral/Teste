import type { Movimentacao, Pagina, TipoMovimentacao } from '@safra/shared';
import { paraIsoUtc } from '../datas';
import type { DB } from '../db/connection';
import type { FiltroExtratoInput } from '../schemas/extrato';

const MOVIMENTACOES = `
  WITH mov AS (
    SELECT 'D-' || d.id AS id, d.id AS num, 'DEPOSITO' AS tipo, d.carteira_id, NULL AS ticker, NULL AS quantidade,
           NULL AS preco_unitario, d.valor AS valor, NULL AS resultado, d.data
      FROM depositos d
    UNION ALL
    SELECT 'C-' || c.id, c.id, 'COMPRA', c.carteira_id, a.ticker, c.quantidade, c.preco_unitario, -c.total, NULL, c.data
      FROM compras c JOIN acoes a ON a.id = c.acao_id
    UNION ALL
    SELECT 'V-' || v.id, v.id, 'VENDA', v.carteira_id, a.ticker, v.quantidade, v.preco_unitario, v.total, v.resultado, v.data
      FROM vendas v JOIN acoes a ON a.id = v.acao_id
  )`;

/** Colunas de ordenação em lista branca — a entrada do usuário nunca vira SQL. */
const COLUNAS_ORDEM = { data: 'mov.data', valor: 'mov.valor' } as const;

interface Linha {
  id: string;
  tipo: TipoMovimentacao;
  carteira_id: number;
  carteira_nome: string;
  ticker: string | null;
  quantidade: number | null;
  preco_unitario: number | null;
  valor: number;
  resultado: number | null;
  data: string;
}

export class ExtratoRepository {
  constructor(private readonly db: DB) {}

  buscar(f: FiltroExtratoInput): Pagina<Movimentacao> {
    const condicoes: string[] = [];
    const parametros: Record<string, unknown> = {};
    const filtrar = (condicao: string, chave: string, valor: unknown) => {
      condicoes.push(condicao);
      parametros[chave] = valor;
    };
    if (f.carteiraId !== undefined) filtrar('mov.carteira_id = @carteiraId', 'carteiraId', f.carteiraId);
    if (f.tipo) filtrar('mov.tipo = @tipo', 'tipo', f.tipo);
    if (f.de || f.ate) parametros.ajuste = `${f.fuso ?? 0} minutes`;
    if (f.de) filtrar('date(mov.data, @ajuste) >= @de', 'de', f.de);
    if (f.ate) filtrar('date(mov.data, @ajuste) <= @ate', 'ate', f.ate);
    if (f.ticker) filtrar("mov.ticker LIKE '%' || @ticker || '%'", 'ticker', f.ticker.toUpperCase());
    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    const direcao = f.direcao === 'asc' ? 'ASC' : 'DESC';

    const total = (this.db.prepare(`${MOVIMENTACOES} SELECT COUNT(*) AS n FROM mov ${where}`).get(parametros) as { n: number }).n;
    const linhas = this.db
      .prepare(
        `${MOVIMENTACOES}
         SELECT mov.*, ca.nome AS carteira_nome
           FROM mov JOIN carteiras ca ON ca.id = mov.carteira_id
           ${where}
          ORDER BY ${COLUNAS_ORDEM[f.ordem]} ${direcao}, mov.data ${direcao}, mov.num ${direcao}
          LIMIT @limite OFFSET @deslocamento`,
      )
      .all({ ...parametros, limite: f.tamanho, deslocamento: (f.pagina - 1) * f.tamanho }) as Linha[];

    return {
      itens: linhas.map((l) => ({
        id: l.id,
        tipo: l.tipo,
        carteiraId: l.carteira_id,
        carteiraNome: l.carteira_nome,
        ticker: l.ticker,
        quantidade: l.quantidade,
        precoUnitario: l.preco_unitario,
        valor: l.valor,
        resultado: l.resultado,
        data: paraIsoUtc(l.data),
      })),
      total,
      pagina: f.pagina,
      tamanho: f.tamanho,
    };
  }
}
