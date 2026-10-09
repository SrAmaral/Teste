import { z } from 'zod';
import { dinheiroSchema } from './comum';

export const acaoSchema = z.object({
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}\d{1,2}$/, 'Ticker inválido (ex.: PETR4)'),
  nome: z.string().trim().min(1, 'Informe o nome').max(80, 'Máximo de 80 caracteres'),
  setor: z.string().trim().max(40, 'Máximo de 40 caracteres').nullish(),
  preco: dinheiroSchema.min(0.01, 'O preço deve ser de pelo menos R$ 0,01'),
});

export const filtroAcoesSchema = z.object({
  ticker: z.string().trim().optional(),
});

/** Na edição o preço é opcional: sem ele, mantém o preço vivo do mercado. */
export const atualizaAcaoSchema = acaoSchema.partial({ preco: true });

export type AcaoInput = z.output<typeof acaoSchema>;
export type AtualizaAcaoInput = z.output<typeof atualizaAcaoSchema>;
