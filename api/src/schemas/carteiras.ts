import { z } from 'zod';
import { dinheiroSchema } from './comum';

const nome = z.string().trim().min(1, 'Informe o nome').max(60, 'Máximo de 60 caracteres');
const descricao = z.string().trim().max(200, 'Máximo de 200 caracteres').nullish();

export const novaCarteiraSchema = z.object({
  nome,
  descricao,
  saldoInicial: dinheiroSchema.min(0, 'Saldo inicial não pode ser negativo').default(0),
});

export const atualizaCarteiraSchema = z.object({ nome, descricao });

export const depositoSchema = z.object({
  valor: dinheiroSchema.min(0.01, 'O depósito deve ser de pelo menos R$ 0,01'),
});

export type NovaCarteiraInput = z.output<typeof novaCarteiraSchema>;
export type AtualizaCarteiraInput = z.output<typeof atualizaCarteiraSchema>;
