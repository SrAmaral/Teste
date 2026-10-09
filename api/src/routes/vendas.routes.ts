import { Router } from 'express';
import { novaVendaSchema } from '../schemas/vendas';
import type { VendasService } from '../services/vendas.service';

export function rotasVendas(vendas: VendasService): Router {
  const rotas = Router();
  rotas.post('/', (req, res) => {
    res.status(201).json(vendas.vender(novaVendaSchema.parse(req.body)));
  });
  return rotas;
}
