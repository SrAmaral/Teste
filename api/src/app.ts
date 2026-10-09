import cors from 'cors';
import express from 'express';
import type { DB } from './db/connection';
import { MercadoSimulado } from './mercado/mercado-simulado';
import { Travas } from './mercado/travas';
import { rotaNaoEncontrada, tratarErros } from './middleware/error-handler';
import { AcoesRepository } from './repositories/acoes.repository';
import { CarteirasRepository } from './repositories/carteiras.repository';
import { DepositosRepository } from './repositories/depositos.repository';
import { ComprasRepository } from './repositories/compras.repository';
import { VendasRepository } from './repositories/vendas.repository';
import { rotasAcoes } from './routes/acoes.routes';
import { rotasCarteiras } from './routes/carteiras.routes';
import { rotasCompras } from './routes/compras.routes';
import { rotasCotacoes } from './routes/cotacoes.routes';
import { rotasVendas } from './routes/vendas.routes';
import { AcoesService } from './services/acoes.service';
import { CarteirasService } from './services/carteiras.service';
import { ComprasService } from './services/compras.service';
import { VendasService } from './services/vendas.service';
import { rotasWeb } from './web';

export const ORIGENS_PERMITIDAS = ['http://localhost:4200', 'http://localhost:4201', 'http://localhost:4202'];

export interface OpcoesApp {
  /** Pasta com os builds dos front-ends (deploy em container único). */
  pastaWeb?: string;
  mercado?: MercadoSimulado;
  travas?: Travas;
}

export function criarApp(db: DB, opcoes: OpcoesApp = {}) {
  const mercado = opcoes.mercado ?? new MercadoSimulado(db);
  const travas = opcoes.travas ?? new Travas();
  const app = express();
  app.use(cors({ origin: ORIGENS_PERMITIDAS }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const carteirasRepo = new CarteirasRepository(db);
  const acoesRepo = new AcoesRepository(db);
  const carteiras = new CarteirasService(db, carteirasRepo, new DepositosRepository(db));
  const acoes = new AcoesService(acoesRepo);
  const comprasRepo = new ComprasRepository(db);
  const vendasRepo = new VendasRepository(db);
  const compras = new ComprasService(db, carteirasRepo, acoesRepo, comprasRepo, travas);
  const vendas = new VendasService(db, carteirasRepo, acoesRepo, comprasRepo, vendasRepo, travas);

  app.use('/api/carteiras', rotasCarteiras(carteiras, compras));
  app.use('/api/acoes', rotasAcoes(acoes));
  app.use('/api/compras', rotasCompras(compras));
  app.use('/api/cotacoes', rotasCotacoes(mercado, travas, acoes));
  app.use('/api/vendas', rotasVendas(vendas));
  if (opcoes.pastaWeb) app.use(rotasWeb(opcoes.pastaWeb));

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
