import { describe, expect, it, vi } from 'vitest';
import { abrirBanco } from '../src/db/connection';
import { MercadoSimulado } from '../src/mercado/mercado-simulado';
import { novaApi, semente } from './helpers';

describe('revisão final da fase 2', () => {
  it.each([['de=2026-13-45'], ['ate=2026-02-30']])('extrato rejeita data impossível: %s', async (query) => {
    const { api } = novaApi();
    const res = await api.get(`/api/extrato?${query}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDACAO');
  });

  it('exclui carteira que só tem depósitos (sem 500) e apaga os depósitos junto', async () => {
    const { db, api } = novaApi();
    const { body } = await api.post('/api/carteiras').send({ nome: 'Só caixa' });
    await api.post(`/api/carteiras/${body.id}/deposito`).send({ valor: 100 });
    const res = await api.delete(`/api/carteiras/${body.id}`);
    expect(res.status).toBe(204);
    expect((db.prepare('SELECT COUNT(*) AS n FROM depositos').get() as { n: number }).n).toBe(0);
  });

  it('um assinante com erro não derruba o tick nem impede os demais', () => {
    const db = abrirBanco(':memory:');
    db.prepare("INSERT INTO acoes (ticker, nome, preco) VALUES ('PETR4', 'Petrobras', 10)").run();
    const mercado = new MercadoSimulado(db, { aleatorio: semente(1) });
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const saudavel = vi.fn();
    mercado.assinar(() => {
      throw new Error('cliente quebrado');
    });
    mercado.assinar(saudavel);
    expect(() => mercado.tick()).not.toThrow();
    expect(saudavel).toHaveBeenCalledTimes(1);
    expect(erro).toHaveBeenCalled();
  });
});
