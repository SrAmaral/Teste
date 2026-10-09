import { TestBed } from '@angular/core/testing';
import { Cotacao } from '@safra/shared';
import { CotacoesStore, FABRICA_EVENT_SOURCE } from './cotacoes-store';
import { FonteFalsa } from './fonte-falsa';

const cot = (acaoId: number, ticker: string, preco: number): Cotacao => ({
  acaoId, ticker, nome: ticker, setor: null, preco, abertura: preco, variacao: 0, historico: [preco], atualizadoEm: '',
});

describe('CotacoesStore', () => {
  let fonte: FonteFalsa;
  let store: CotacoesStore;

  beforeEach(() => {
    fonte = new FonteFalsa();
    TestBed.configureTestingModule({ providers: [CotacoesStore, { provide: FABRICA_EVENT_SOURCE, useValue: () => fonte }] });
    store = TestBed.inject(CotacoesStore);
  });

  it('começa conectando e fica ao vivo no snapshot', () => {
    expect(store.status()).toBe('conectando');
    fonte.emitir('snapshot', [cot(2, 'VALE3', 61), cot(1, 'PETR4', 38)]);
    expect(store.status()).toBe('ao-vivo');
    expect(store.lista().map((c) => c.ticker)).toEqual(['PETR4', 'VALE3']);
  });

  it('mescla ticks sobre o snapshot', () => {
    fonte.emitir('snapshot', [cot(1, 'PETR4', 38), cot(2, 'VALE3', 61)]);
    fonte.emitir('cotacoes', [cot(1, 'PETR4', 39)]);
    expect(store.cotacao(1)?.preco).toBe(39);
    expect(store.cotacao(2)?.preco).toBe(61);
  });

  it('vai a reconectando no erro e volta ao vivo sem perder o mapa', () => {
    fonte.emitir('snapshot', [cot(1, 'PETR4', 38)]);
    fonte.falhar();
    expect(store.status()).toBe('reconectando');
    expect(store.cotacao(1)?.preco).toBe(38);
    fonte.emitir('cotacoes', [cot(1, 'PETR4', 40)]);
    expect(store.status()).toBe('ao-vivo');
  });

  it('fecha a conexão ao destruir o injector', () => {
    TestBed.resetTestingModule();
    expect(fonte.fechada).toBe(true);
  });
});
