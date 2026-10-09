import { Router } from 'express';
import { acaoSchema, atualizaAcaoSchema, filtroAcoesSchema } from '../schemas/acoes';
import { idSchema } from '../schemas/comum';
import type { AcoesService } from '../services/acoes.service';

export function rotasAcoes(acoes: AcoesService): Router {
  const rotas = Router();

  rotas.get('/', (req, res) => {
    res.json(acoes.listar(filtroAcoesSchema.parse(req.query).ticker));
  });

  rotas.post('/', (req, res) => {
    res.status(201).json(acoes.criar(acaoSchema.parse(req.body)));
  });

  rotas.get('/:id', (req, res) => {
    res.json(acoes.obter(idSchema.parse(req.params.id)));
  });

  rotas.put('/:id', (req, res) => {
    res.json(acoes.atualizar(idSchema.parse(req.params.id), atualizaAcaoSchema.parse(req.body)));
  });

  rotas.delete('/:id', (req, res) => {
    acoes.excluir(idSchema.parse(req.params.id));
    res.status(204).end();
  });

  return rotas;
}
