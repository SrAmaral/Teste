import cors from 'cors';
import express from 'express';
import type { DB } from './db/connection';
import { rotaNaoEncontrada, tratarErros } from './middleware/error-handler';

export const ORIGENS_PERMITIDAS = ['http://localhost:4200', 'http://localhost:4201', 'http://localhost:4202'];

export function criarApp(db: DB) {
  const app = express();
  app.use(cors({ origin: ORIGENS_PERMITIDAS }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // rotas de domínio são registradas aqui nas Tasks 3–5

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
