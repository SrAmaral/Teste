import { Router } from 'express';
import { idSchema } from '../schemas/comum';
import { atualizaCarteiraSchema, depositoSchema, novaCarteiraSchema } from '../schemas/carteiras';
import type { CarteirasService } from '../services/carteiras.service';

export function rotasCarteiras(carteiras: CarteirasService): Router {
  const rotas = Router();

  rotas.get('/', (_req, res) => {
    res.json(carteiras.listar());
  });

  rotas.post('/', (req, res) => {
    res.status(201).json(carteiras.criar(novaCarteiraSchema.parse(req.body)));
  });

  rotas.get('/:id', (req, res) => {
    res.json(carteiras.obter(idSchema.parse(req.params.id)));
  });

  rotas.put('/:id', (req, res) => {
    res.json(carteiras.atualizar(idSchema.parse(req.params.id), atualizaCarteiraSchema.parse(req.body)));
  });

  rotas.delete('/:id', (req, res) => {
    carteiras.excluir(idSchema.parse(req.params.id));
    res.status(204).end();
  });

  rotas.post('/:id/deposito', (req, res) => {
    res.json(carteiras.depositar(idSchema.parse(req.params.id), depositoSchema.parse(req.body).valor));
  });

  return rotas;
}
