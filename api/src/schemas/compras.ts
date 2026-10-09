import { z } from 'zod';

export const novaCompraSchema = z.object({
  carteiraId: z.number().int().positive(),
  acaoId: z.number().int().positive(),
  quantidade: z.number().int('A quantidade deve ser um número inteiro').positive('A quantidade deve ser maior que zero'),
  travaToken: z.string().min(1).max(64).optional(),
});

export const filtroComprasSchema = z.object({
  carteiraId: z.coerce.number().int().positive().optional(),
});

export type NovaCompraInput = z.output<typeof novaCompraSchema>;
