import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../errors';

export const rotaNaoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ code: 'NAO_ENCONTRADO', message: 'Rota não encontrada' });
};

export const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'VALIDACAO',
      message: 'Dados inválidos',
      details: err.issues.map((i) => ({ campo: i.path.map(String).join('.'), mensagem: i.message })),
    });
    return;
  }
  if (err instanceof DomainError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ code: 'JSON_INVALIDO', message: 'Corpo da requisição não é um JSON válido' });
    return;
  }
  console.error('[api] erro não tratado', err);
  res.status(500).json({ code: 'ERRO_INTERNO', message: 'Erro interno do servidor' });
};
