import { ParamMap, Params } from '@angular/router';
import { FiltroExtrato, TipoMovimentacao } from '@safra/shared';

export type FiltroCompleto = FiltroExtrato & Required<Pick<FiltroExtrato, 'ordem' | 'direcao' | 'pagina' | 'tamanho'>>;

export const PADRAO: Required<Pick<FiltroExtrato, 'ordem' | 'direcao' | 'pagina' | 'tamanho'>> = { ordem: 'data', direcao: 'desc', pagina: 1, tamanho: 20 };
const TIPOS: TipoMovimentacao[] = ['DEPOSITO', 'COMPRA', 'VENDA'];
const DIA = /^\d{4}-\d{2}-\d{2}$/;

const inteiroPositivo = (v: string | null) => (v && /^\d+$/.test(v) && Number(v) > 0 ? Number(v) : undefined);

export function filtroDeParams(params: ParamMap): FiltroCompleto {
  const f: FiltroCompleto = { ...PADRAO };
  const carteiraId = inteiroPositivo(params.get('carteiraId'));
  if (carteiraId) f.carteiraId = carteiraId;
  const tipo = params.get('tipo') as TipoMovimentacao | null;
  if (tipo && TIPOS.includes(tipo)) f.tipo = tipo;
  for (const chave of ['de', 'ate'] as const) {
    const v = params.get(chave);
    if (v && DIA.test(v)) f[chave] = v;
  }
  const ticker = params.get('ticker')?.trim();
  if (ticker) f.ticker = ticker;
  if (params.get('ordem') === 'valor') f.ordem = 'valor';
  if (params.get('direcao') === 'asc') f.direcao = 'asc';
  f.pagina = inteiroPositivo(params.get('pagina')) ?? 1;
  return f;
}

export function paramsDeFiltro(f: FiltroExtrato): Params {
  const params: Params = {};
  for (const [chave, valor] of Object.entries(f)) {
    if (valor === undefined || valor === null || valor === '') continue;
    if (chave in PADRAO && PADRAO[chave as keyof typeof PADRAO] === valor) continue;
    params[chave] = valor;
  }
  return params;
}
