// Relativo: em dev o `ng serve` de cada app faz proxy de /api para :3000 (proxy.conf.json); em produção a API serve os front-ends na mesma origem.
export const API_BASE_URL = '/api';

export interface Carteira {
  id: number;
  nome: string;
  descricao: string | null;
  saldo: number;
  criadoEm: string;
}

export interface CarteiraResumo extends Carteira {
  valorInvestido: number;
  qtdAtivos: number;
}

export interface NovaCarteira {
  nome: string;
  descricao?: string | null;
  saldoInicial?: number;
}

export interface AtualizaCarteira {
  nome: string;
  descricao?: string | null;
}

export interface Acao {
  id: number;
  ticker: string;
  nome: string;
  setor: string | null;
  preco: number;
  atualizadoEm: string;
}

export interface NovaAcao {
  ticker: string;
  nome: string;
  setor?: string | null;
  preco: number;
}

export interface Compra {
  id: number;
  carteiraId: number;
  acaoId: number;
  ticker: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  data: string;
}

export interface NovaCompra {
  carteiraId: number;
  acaoId: number;
  quantidade: number;
  travaToken?: string;
}

export interface CompraResultado {
  compra: Compra;
  saldoRestante: number;
}

export interface Posicao {
  acaoId: number;
  ticker: string;
  nome: string;
  setor: string | null;
  quantidade: number;
  precoMedio: number;
  precoAtual: number;
  valorInvestido: number;
  valorAtual: number;
  resultado: number;
  resultadoPercentual: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface Health {
  status: 'ok';
}

export const COTACOES_STREAM_URL = `${API_BASE_URL}/cotacoes/stream`;
export const ORDEM_EXECUTADA_EVENT = 'safra:ordem-executada';

export interface Cotacao {
  acaoId: number;
  ticker: string;
  nome: string;
  setor: string | null;
  preco: number;
  abertura: number;
  variacao: number;
  historico: number[];
  atualizadoEm: string;
}

export interface Trava {
  token: string;
  acaoId: number;
  preco: number;
  expiraEm: string;
}

export interface NovaVenda {
  carteiraId: number;
  acaoId: number;
  quantidade: number;
  travaToken?: string;
}

export interface Venda {
  id: number;
  carteiraId: number;
  acaoId: number;
  ticker: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  custo: number;
  resultado: number;
  data: string;
}

export interface VendaResultado {
  venda: Venda;
  saldoRestante: number;
}

export type TipoMovimentacao = 'DEPOSITO' | 'COMPRA' | 'VENDA';

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  carteiraId: number;
  carteiraNome: string;
  ticker: string | null;
  quantidade: number | null;
  precoUnitario: number | null;
  valor: number;
  resultado: number | null;
  data: string;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

export interface FiltroExtrato {
  carteiraId?: number;
  tipo?: TipoMovimentacao;
  de?: string;
  ate?: string;
  ticker?: string;
  ordem?: 'data' | 'valor';
  direcao?: 'asc' | 'desc';
  pagina?: number;
  tamanho?: number;
}

export interface FatiaAlocacao {
  nome: string;
  valor: number;
  percentual: number;
}

export interface PontoSerie {
  t: string;
  valor: number;
}

export interface Dashboard {
  patrimonio: number;
  caixa: number;
  valorMercado: number;
  investido: number;
  resultadoNaoRealizado: number;
  resultadoRealizado: number;
  variacaoDia: number;
  variacaoDiaPercentual: number;
  alocacaoPorSetor: FatiaAlocacao[];
  alocacaoPorAtivo: FatiaAlocacao[];
  serie: PontoSerie[];
  maioresAltas: Cotacao[];
  maioresBaixas: Cotacao[];
  posicoes: Posicao[];
}

export interface OrdemExecutada {
  tipo: 'COMPRA' | 'VENDA';
  carteiraId: number;
  ticker: string;
  quantidade: number;
  total: number;
  saldoRestante: number;
  resultado?: number;
}
