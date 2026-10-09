import { z } from 'zod';

const dia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD')
  .refine((s) => {
    const data = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(data.getTime()) && data.toISOString().startsWith(s);
  }, 'Data inexistente');

export const filtroExtratoSchema = z.object({
  carteiraId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(['DEPOSITO', 'COMPRA', 'VENDA']).optional(),
  de: dia.optional(),
  ate: dia.optional(),
  ticker: z.string().trim().regex(/^[A-Za-z0-9]{1,10}$/, 'Use apenas letras e números').optional(),
  /** Deslocamento do fuso do usuário em minutos (ex.: −180 para UTC−3), para filtrar o dia local. */
  fuso: z.coerce.number().int().min(-840).max(840).optional(),
  ordem: z.enum(['data', 'valor']).default('data'),
  direcao: z.enum(['asc', 'desc']).default('desc'),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(100).default(20),
});

export type FiltroExtratoInput = z.output<typeof filtroExtratoSchema>;
