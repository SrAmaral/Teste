export const API_BASE_URL = 'http://localhost:3000/api';
export const COMPRA_REALIZADA_EVENT = 'safra:compra-realizada';

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
}

export interface CompraResultado {
  compra: Compra;
  saldoRestante: number;
}

export interface Posicao {
  acaoId: number;
  ticker: string;
  nome: string;
  quantidade: number;
  precoMedio: number;
  precoAtual: number;
  valorInvestido: number;
  valorAtual: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface Health {
  status: 'ok';
}
