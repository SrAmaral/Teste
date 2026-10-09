import type { DB } from './connection';

const ACOES: [ticker: string, nome: string, setor: string, preco: number][] = [
  ['PETR4', 'Petrobras PN', 'Petróleo e Gás', 38.42],
  ['VALE3', 'Vale ON', 'Mineração', 61.15],
  ['ITUB4', 'Itaú Unibanco PN', 'Financeiro', 35.8],
  ['BBDC4', 'Bradesco PN', 'Financeiro', 15.27],
  ['BBAS3', 'Banco do Brasil ON', 'Financeiro', 27.9],
  ['WEGE3', 'WEG ON', 'Bens Industriais', 52.64],
  ['ABEV3', 'Ambev ON', 'Consumo', 13.05],
  ['MGLU3', 'Magazine Luiza ON', 'Varejo', 9.48],
];

export function popularSeVazio(db: DB): void {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM acoes').get() as { n: number };
  if (n > 0) return;

  const inserirAcao = db.prepare('INSERT INTO acoes (ticker, nome, setor, preco) VALUES (?, ?, ?, ?)');
  const inserirCarteira = db.prepare('INSERT INTO carteiras (nome, descricao, saldo) VALUES (?, ?, ?)');

  db.transaction(() => {
    for (const acao of ACOES) inserirAcao.run(...acao);
    inserirCarteira.run('Carteira Conservadora', 'Foco em bancos e dividendos', 10000);
    inserirCarteira.run('Carteira Arrojada', 'Mais exposição a varejo e indústria', 25000);
  })();
}
