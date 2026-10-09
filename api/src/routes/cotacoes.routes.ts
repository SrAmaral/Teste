import { Router } from 'express';
import type { MercadoSimulado } from '../mercado/mercado-simulado';
import type { Travas } from '../mercado/travas';
import { idSchema } from '../schemas/comum';
import type { AcoesService } from '../services/acoes.service';

const HEARTBEAT_MS = 15_000;

export function rotasCotacoes(mercado: MercadoSimulado, travas: Travas, acoes: AcoesService): Router {
  const rotas = Router();

  rotas.get('/', (_req, res) => {
    res.json(mercado.cotacoes());
  });

  /** Server-Sent Events: snapshot ao conectar, depois um evento por tick. */
  rotas.get('/stream', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    const enviar = (evento: string, dados: unknown) => res.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`);

    enviar('snapshot', mercado.cotacoes());
    const cancelar = mercado.assinar((cotacoes) => enviar('cotacoes', cotacoes));
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), HEARTBEAT_MS);
    req.on('close', () => {
      cancelar();
      clearInterval(heartbeat);
    });
  });

  rotas.post('/:acaoId/trava', (req, res) => {
    const acao = acoes.obter(idSchema.parse(req.params.acaoId));
    const cotacao = mercado.cotacao(acao.id) ?? { preco: acao.preco };
    res.status(201).json(travas.criar(acao.id, cotacao.preco));
  });

  return rotas;
}
