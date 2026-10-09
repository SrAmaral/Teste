import { describe, expect, it } from 'vitest';
import { abrirBanco } from '../src/db/connection';
import { MercadoSimulado } from '../src/mercado/mercado-simulado';
import { novaApi, semente } from './helpers';

describe('pendências da fase 2', () => {
  it('compra recusada por saldo não gasta a trava (a mesma trava serve na nova tentativa)', async () => {
    const { api } = novaApi();
    const carteira = (await api.post('/api/carteiras').send({ nome: 'C', saldoInicial: 100 })).body;
    const acao = (await api.post('/api/acoes').send({ ticker: 'PETR4', nome: 'Petrobras', preco: 30 })).body;
    const { token } = (await api.post(`/api/cotacoes/${acao.id}/trava`)).body;
    const semSaldo = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 4, travaToken: token });
    expect(semSaldo.status).toBe(422);
    const ok = await api.post('/api/compras').send({ carteiraId: carteira.id, acaoId: acao.id, quantidade: 3, travaToken: token });
    expect(ok.status).toBe(201);
  });

  it('extrato filtra o dia no fuso informado (horário local do usuário)', async () => {
    const { db, api } = novaApi();
    const carteira = (await api.post('/api/carteiras').send({ nome: 'C' })).body;
    await api.post(`/api/carteiras/${carteira.id}/deposito`).send({ valor: 10 });
    db.prepare("UPDATE depositos SET data = '2026-01-16 01:00:00'").run(); // 22:00 do dia 15 em UTC−3
    expect((await api.get('/api/extrato?de=2026-01-15&ate=2026-01-15&fuso=-180')).body.total).toBe(1);
    expect((await api.get('/api/extrato?de=2026-01-15&ate=2026-01-15')).body.total).toBe(0);
    expect((await api.get('/api/extrato?fuso=9999')).status).toBe(400);
  });

  it('filtro de ticker aceita só letras e números (sem curingas do LIKE)', async () => {
    const { api } = novaApi();
    expect((await api.get('/api/extrato?ticker=%25')).status).toBe(400);
    expect((await api.get('/api/extrato?ticker=_')).status).toBe(400);
    expect((await api.get('/api/extrato?ticker=pet4')).status).toBe(200);
  });

  it('editar ação sem enviar preço preserva o preço vivo', async () => {
    const { api } = novaApi();
    const acao = (await api.post('/api/acoes').send({ ticker: 'PETR4', nome: 'Petrobras', preco: 30 })).body;
    const res = await api.put(`/api/acoes/${acao.id}`).send({ ticker: 'PETR4', nome: 'Petrobras PN' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: 'Petrobras PN', preco: 30 });
  });

  it('mudança de preço feita fora do simulador vira a nova abertura (sem salto na variação do dia)', () => {
    const db = abrirBanco(':memory:');
    db.prepare("INSERT INTO acoes (ticker, nome, preco) VALUES ('PETR4', 'Petrobras', 10)").run();
    const mercado = new MercadoSimulado(db, { aleatorio: semente(1) });
    mercado.tick();
    db.prepare('UPDATE acoes SET preco = 50').run();
    const [cotacao] = mercado.cotacoes();
    expect(cotacao).toMatchObject({ preco: 50, abertura: 50, variacao: 0 });
    expect(cotacao.historico.every((p) => p === 50)).toBe(true);
  });
});
