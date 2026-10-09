import type { Carteira, CarteiraResumo } from '@safra/shared';
import type { DB } from '../db/connection';
import { paraIsoUtc } from '../datas';
import { arredondar } from '../dinheiro';

interface CarteiraLinha {
  id: number;
  nome: string;
  descricao: string | null;
  saldo: number;
  criado_em: string;
}

interface ResumoLinha extends CarteiraLinha {
  valor_investido: number;
  qtd_ativos: number;
}

const paraCarteira = (l: CarteiraLinha): Carteira => ({
  id: l.id,
  nome: l.nome,
  descricao: l.descricao,
  saldo: l.saldo,
  criadoEm: paraIsoUtc(l.criado_em),
});

export class CarteirasRepository {
  constructor(private readonly db: DB) {}

  listarResumo(): CarteiraResumo[] {
    const linhas = this.db
      .prepare(
        `SELECT c.*, COALESCE(SUM(co.total), 0) AS valor_investido, COUNT(DISTINCT co.acao_id) AS qtd_ativos
           FROM carteiras c
           LEFT JOIN compras co ON co.carteira_id = c.id
          GROUP BY c.id
          ORDER BY c.nome`,
      )
      .all() as ResumoLinha[];
    return linhas.map((l) => ({ ...paraCarteira(l), valorInvestido: arredondar(l.valor_investido), qtdAtivos: l.qtd_ativos }));
  }

  buscar(id: number): Carteira | undefined {
    const linha = this.db.prepare('SELECT * FROM carteiras WHERE id = ?').get(id) as CarteiraLinha | undefined;
    return linha && paraCarteira(linha);
  }

  inserir(dados: { nome: string; descricao: string | null; saldo: number }): Carteira {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO carteiras (nome, descricao, saldo) VALUES (?, ?, ?)')
      .run(dados.nome, dados.descricao, dados.saldo);
    return this.buscar(Number(lastInsertRowid))!;
  }

  atualizar(id: number, dados: { nome: string; descricao: string | null }): void {
    this.db.prepare('UPDATE carteiras SET nome = ?, descricao = ? WHERE id = ?').run(dados.nome, dados.descricao, id);
  }

  atualizarSaldo(id: number, saldo: number): void {
    this.db.prepare('UPDATE carteiras SET saldo = ? WHERE id = ?').run(saldo, id);
  }

  excluir(id: number): void {
    this.db.prepare('DELETE FROM carteiras WHERE id = ?').run(id);
  }

  contarCompras(id: number): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM compras WHERE carteira_id = ?').get(id) as { n: number }).n;
  }
}
