import { z } from 'zod';
import { arredondar } from '../dinheiro';

export const idSchema = z.coerce.number().int().positive();

const VALOR_MAXIMO = 1_000_000_000_000;

/** Valor em reais: no máximo 2 casas decimais e teto que impede o saldo de virar Infinity. */
export const dinheiroSchema = z
  .number()
  .max(VALOR_MAXIMO, 'Valor acima do limite permitido')
  .refine((v) => Math.abs(arredondar(v) - v) < 1e-9, 'Use no máximo 2 casas decimais');
