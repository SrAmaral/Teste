import { Router } from 'express';
import { z } from 'zod';
import type { DashboardService } from '../services/dashboard.service';

const filtro = z.object({ carteiraId: z.coerce.number().int().positive().optional() });

export function rotasDashboard(dashboard: DashboardService): Router {
  const rotas = Router();
  rotas.get('/', (req, res) => {
    res.json(dashboard.obter(filtro.parse(req.query).carteiraId));
  });
  return rotas;
}
