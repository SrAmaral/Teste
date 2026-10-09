import { Router } from 'express';
import { idSchema } from '../schemas/comum';
import { atualizaCarteiraSchema, depositoSchema, novaCarteiraSchema } from '../schemas/carteiras';
import type { CarteirasService } from '../services/carteiras.service';
import type { ComprasService } from '../services/compras.service';

export function rotasCarteiras(carteiras: CarteirasService, compras: ComprasService): Router {
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

  rotas.get('/:id/posicoes', (req, res) => {
    res.json(compras.posicoes(idSchema.parse(req.params.id)));
  });

  rotas.post('/:id/deposito', (req, res) => {
    res.json(carteiras.depositar(idSchema.parse(req.params.id), depositoSchema.parse(req.body).valor));
  });

  return rotas;
}
