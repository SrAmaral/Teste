import type { Lado } from '../mercado/mercado';

const r = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function quantidadeMaxima(lado: Lado, preco: number, saldo: number, posicao: number): number {
  if (lado === 'VENDER') return posicao;
  return preco > 0 ? Math.floor(r(saldo) / preco + 1e-9) : 0;
}

export function quantidadePorFracao(maximo: number, fracao: number): number {
  return Math.max(0, Math.floor(maximo * fracao));
}

export interface ResumoOrdem {
  total: number;
  saldoApos: number;
  resultadoEstimado: number | null;
  valida: boolean;
  motivo: string | null;
}

export function resumoOrdem(e: { lado: Lado; preco: number; quantidade: number; saldo: number; posicao: { quantidade: number; precoMedio: number } | null }): ResumoOrdem {
  const inteira = Number.isInteger(e.quantidade) && e.quantidade > 0;
  const total = inteira ? r(e.preco * e.quantidade) : 0;
  const compra = e.lado === 'COMPRAR';
  const saldoApos = r(compra ? e.saldo - total : e.saldo + total);
  const resultadoEstimado = !compra && e.posicao && inteira ? r(total - e.posicao.precoMedio * e.quantidade) : null;

  let motivo: string | null = null;
  if (!inteira) motivo = 'Informe uma quantidade inteira';
  else if (compra && total > e.saldo) motivo = 'Saldo insuficiente';
  else if (!compra && !e.posicao) motivo = 'Sem posição nesta carteira';
  else if (!compra && e.quantidade > e.posicao!.quantidade) motivo = 'Quantidade acima da posição';

  return { total, saldoApos, resultadoEstimado, valida: motivo === null, motivo };
}
