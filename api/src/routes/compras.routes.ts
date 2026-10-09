import { Router } from 'express';
import { filtroComprasSchema, novaCompraSchema } from '../schemas/compras';
import type { ComprasService } from '../services/compras.service';

export function rotasCompras(compras: ComprasService): Router {
  const rotas = Router();

  rotas.get('/', (req, res) => {
    res.json(compras.listar(filtroComprasSchema.parse(req.query).carteiraId));
  });

  rotas.post('/', (req, res) => {
    res.status(201).json(compras.comprar(novaCompraSchema.parse(req.body)));
  });

  return rotas;
}
