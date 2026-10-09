import { Router } from 'express';
import type { ExtratoRepository } from '../repositories/extrato.repository';
import { filtroExtratoSchema } from '../schemas/extrato';

export function rotasExtrato(extrato: ExtratoRepository): Router {
  const rotas = Router();
  rotas.get('/', (req, res) => {
    res.json(extrato.buscar(filtroExtratoSchema.parse(req.query)));
  });
  return rotas;
}
