import { describe, expect, it, vi } from 'vitest';
import { abrirBanco } from '../src/db/connection';
import { MercadoSimulado } from '../src/mercado/mercado-simulado';
import { Travas } from '../src/mercado/travas';
import { semente } from './helpers';

function bancoCom(acoes: [ticker: string, preco: number, setor?: string][]) {
  const db = abrirBanco(':memory:');
  const inserir = db.prepare('INSERT INTO acoes (ticker, nome, setor, preco) VALUES (?, ?, ?, ?)');
  for (const [ticker, preco, setor] of acoes) inserir.run(ticker, `${ticker} SA`, setor ?? null, preco);
  return db;
}

describe('MercadoSimulado', () => {
  it('antes do primeiro tick a cotação é o preço do banco, com variação zero', () => {
    const mercado = new MercadoSimulado(bancoCom([['PETR4', 38.42, 'Energia']]), { aleatorio: semente(1) });
    expect(mercado.cotacoes()).toEqual([
      expect.objectContaining({ ticker: 'PETR4', nome: 'PETR4 SA', setor: 'Energia', preco: 38.42, abertura: 38.42, variacao: 0, historico: [38.42] }),
    ]);
  });

  it('tick move o preço, grava no banco e calcula a variação sobre a abertura', () => {
    const db = bancoCom([['PETR4', 38.42]]);
    const mercado = new MercadoSimulado(db, { aleatorio: semente(1), volatilidade: 0.05 });
    const [depois] = mercado.tick();
    expect(depois.preco).not.toBe(38.42);
    expect((db.prepare('SELECT preco FROM acoes').get() as { preco: number }).preco).toBe(depois.preco);
    expect(depois.abertura).toBe(38.42);
    expect(depois.variacao).toBeCloseTo(((depois.preco - 38.42) / 38.42) * 100, 2);
  });

  it('é determinístico com a mesma semente', () => {
    const serie = () => {
      const mercado = new MercadoSimulado(bancoCom([['VALE3', 61.15]]), { aleatorio: semente(7) });
      return Array.from({ length: 10 }, () => mercado.tick()[0].preco);
    };
    expect(serie()).toEqual(serie());
  });

  it('nunca deixa o preço abaixo de R$ 0,01', () => {
    const mercado = new MercadoSimulado(bancoCom([['MGLU3', 0.01]]), { aleatorio: () => 0.5, volatilidade: 5 });
    expect(mercado.tick()[0].preco).toBe(0.01);
  });

  it('mantém histórico alinhado e limitado, incluindo ações novas e removendo excluídas', () => {
    const db = bancoCom([['PETR4', 10]]);
    const mercado = new MercadoSimulado(db, { aleatorio: semente(3), ticksPorPonto: 2, maxPontos: 3 });
    for (let i = 0; i < 4; i++) mercado.tick();
    db.prepare("INSERT INTO acoes (ticker, nome, preco) VALUES ('VALE3', 'Vale', 20)").run();
    for (let i = 0; i < 6; i++) mercado.tick();
    const [petr, vale] = mercado.cotacoes();
    expect(mercado.linhaDoTempo()).toHaveLength(3);
    expect(petr.historico).toHaveLength(3);
    expect(vale.historico).toHaveLength(3);

    db.prepare("DELETE FROM acoes WHERE ticker = 'PETR4'").run();
    expect(mercado.tick().map((c) => c.ticker)).toEqual(['VALE3']);
  });

  it('notifica assinantes a cada tick até cancelar', () => {
    const mercado = new MercadoSimulado(bancoCom([['PETR4', 10]]), { aleatorio: semente(5) });
    const ouvinte = vi.fn();
    const cancelar = mercado.assinar(ouvinte);
    mercado.tick();
    cancelar();
    mercado.tick();
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(ouvinte.mock.calls[0][0][0]).toMatchObject({ ticker: 'PETR4' });
  });
});

describe('Travas', () => {
  it('consome uma trava válida e devolve o preço travado', () => {
    const travas = new Travas();
    const trava = travas.criar(1, 38.42);
    expect(trava).toMatchObject({ acaoId: 1, preco: 38.42, token: expect.any(String) });
    expect(travas.consumir(trava.token, 1)).toBe(38.42);
  });

  it('recusa trava reutilizada, de outra ação, inexistente ou expirada', () => {
    let agora = new Date('2026-10-09T12:00:00Z');
    const travas = new Travas(() => agora);
    const usada = travas.criar(1, 10);
    travas.consumir(usada.token, 1);
    expect(() => travas.consumir(usada.token, 1)).toThrow(expect.objectContaining({ status: 409, code: 'COTACAO_EXPIRADA' }));

    const outra = travas.criar(1, 10);
    expect(() => travas.consumir(outra.token, 2)).toThrow(expect.objectContaining({ code: 'COTACAO_EXPIRADA' }));
    expect(() => travas.consumir('nao-existe', 1)).toThrow(expect.objectContaining({ code: 'COTACAO_EXPIRADA' }));

    const expirada = travas.criar(1, 10);
    agora = new Date(agora.getTime() + 8001);
    expect(() => travas.consumir(expirada.token, 1)).toThrow(expect.objectContaining({ code: 'COTACAO_EXPIRADA' }));
  });

  it('informa a expiração em ISO 8601', () => {
    const travas = new Travas(() => new Date('2026-10-09T12:00:00Z'));
    expect(travas.criar(1, 10).expiraEm).toBe('2026-10-09T12:00:08.000Z');
  });
});
