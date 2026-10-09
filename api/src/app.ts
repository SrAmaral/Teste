import cors from 'cors';
import express from 'express';
import type { DB } from './db/connection';
import { rotaNaoEncontrada, tratarErros } from './middleware/error-handler';
import { AcoesRepository } from './repositories/acoes.repository';
import { CarteirasRepository } from './repositories/carteiras.repository';
import { rotasAcoes } from './routes/acoes.routes';
import { rotasCarteiras } from './routes/carteiras.routes';
import { AcoesService } from './services/acoes.service';
import { CarteirasService } from './services/carteiras.service';

export const ORIGENS_PERMITIDAS = ['http://localhost:4200', 'http://localhost:4201', 'http://localhost:4202'];

export function criarApp(db: DB) {
  const app = express();
  app.use(cors({ origin: ORIGENS_PERMITIDAS }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const carteirasRepo = new CarteirasRepository(db);
  const carteiras = new CarteirasService(carteirasRepo);

  app.use('/api/carteiras', rotasCarteiras(carteiras));

  const acoesRepo = new AcoesRepository(db);
  const acoes = new AcoesService(acoesRepo);

  app.use('/api/acoes', rotasAcoes(acoes));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
