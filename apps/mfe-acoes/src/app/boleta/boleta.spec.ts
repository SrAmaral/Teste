import { vi } from 'vitest';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Cotacao, ORDEM_EXECUTADA_EVENT } from '@safra/shared';
import { of, throwError } from 'rxjs';
import { AcoesApi } from '../data/acoes-api';
import { Boleta } from './boleta';

const acao: Cotacao = { acaoId: 10, ticker: 'PETR4', nome: 'Petrobras PN', setor: null, preco: 33.33, abertura: 33, variacao: 1, historico: [], atualizadoEm: '' };
const carteiras = [{ id: 1, nome: 'Renda', descricao: null, saldo: 100, criadoEm: '', valorInvestido: 0, qtdAtivos: 0 }];
const trava = (token: string, preco = 33.33) => ({ token, acaoId: 10, preco, expiraEm: new Date(Date.now() + 8000).toISOString() });

describe('Boleta', () => {
  const api = { carteiras: vi.fn(), posicoes: vi.fn(), travar: vi.fn(), comprar: vi.fn(), vender: vi.fn() };

  beforeAll(() => registerLocaleData(localePt));
  afterEach(() => vi.useRealTimers());

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    api.carteiras.mockReturnValue(of(carteiras));
    api.posicoes.mockReturnValue(of([{ acaoId: 10, ticker: 'PETR4', nome: '', setor: null, quantidade: 7, precoMedio: 30, precoAtual: 33.33, valorInvestido: 210, valorAtual: 233.31, resultado: 23.31, resultadoPercentual: 11.1 }]));
    api.travar.mockImplementation(() => of(trava(`t${api.travar.mock.calls.length}`)));
    await TestBed.configureTestingModule({
      imports: [Boleta],
      providers: [provideRouter([]), { provide: AcoesApi, useValue: api }, { provide: LOCALE_ID, useValue: 'pt-BR' }, { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }],
    }).compileComponents();
  });

  function montar(lado: 'COMPRAR' | 'VENDER' = 'COMPRAR') {
    const fixture = TestBed.createComponent(Boleta);
    fixture.componentRef.setInput('acao', acao);
    fixture.componentRef.setInput('lado', lado);
    fixture.componentRef.setInput('carteiraInicial', 1);
    fixture.detectChanges();
    return fixture;
  }

  it('trava a cotação ao abrir e conta 8 segundos regressivos', () => {
    const fixture = montar();
    expect(api.travar).toHaveBeenCalledWith(10);
    expect(fixture.componentInstance.segundosRestantes()).toBe(8);
    vi.advanceTimersByTime(3000);
    expect(fixture.componentInstance.segundosRestantes()).toBe(5);
    fixture.destroy();
  });

  it('MÁX usa o saldo na compra e a posição na venda', () => {
    const compra = montar('COMPRAR').componentInstance;
    compra.aplicarFracao(1);
    expect(compra.quantidade()).toBe(3);
  });

  it('MÁX na venda usa a posição da carteira', () => {
    const venda = montar('VENDER').componentInstance;
    venda.aplicarFracao(1);
    expect(venda.quantidade()).toBe(7);
  });

  it('confirma com o token da trava e dispara safra:ordem-executada', () => {
    api.comprar.mockReturnValue(of({ compra: { id: 1, carteiraId: 1, acaoId: 10, ticker: 'PETR4', quantidade: 2, precoUnitario: 33.33, total: 66.66, data: '' }, saldoRestante: 33.34 }));
    const ouvinte = vi.fn();
    window.addEventListener(ORDEM_EXECUTADA_EVENT, ouvinte);
    const c = montar().componentInstance;
    c.quantidade.set(2);
    c.confirmar();
    window.removeEventListener(ORDEM_EXECUTADA_EVENT, ouvinte);
    expect(api.comprar).toHaveBeenCalledWith({ carteiraId: 1, acaoId: 10, quantidade: 2, travaToken: 't1' });
    expect((ouvinte.mock.calls[0][0] as CustomEvent).detail).toEqual({ tipo: 'COMPRA', carteiraId: 1, ticker: 'PETR4', quantidade: 2, total: 66.66, saldoRestante: 33.34 });
  });

  it('COTACAO_EXPIRADA na confirmação renova a trava e não dispara evento', () => {
    api.comprar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'COTACAO_EXPIRADA', message: 'expirou' } })));
    const ouvinte = vi.fn();
    window.addEventListener(ORDEM_EXECUTADA_EVENT, ouvinte);
    const c = montar().componentInstance;
    c.quantidade.set(1);
    c.confirmar();
    window.removeEventListener(ORDEM_EXECUTADA_EVENT, ouvinte);
    expect(api.travar).toHaveBeenCalledTimes(2);
    expect(ouvinte).not.toHaveBeenCalled();
    expect(c.aviso()).toContain('Cotação renovada');
  });

  it('com a trava expirada, confirmar apenas renova (não envia ordem)', () => {
    const c = montar().componentInstance;
    c.quantidade.set(1);
    vi.advanceTimersByTime(8500);
    c.confirmar();
    expect(api.comprar).not.toHaveBeenCalled();
    expect(api.travar).toHaveBeenCalledTimes(2);
  });

  it('ticks da mesma ação não renovam a trava nem apagam a confirmação', () => {
    api.comprar.mockReturnValue(of({ compra: { id: 1, carteiraId: 1, acaoId: 10, ticker: 'PETR4', quantidade: 1, precoUnitario: 33.33, total: 33.33, data: '' }, saldoRestante: 66.67 }));
    const fixture = montar();
    const c = fixture.componentInstance;
    c.confirmar();
    const travasDepoisDaOrdem = api.travar.mock.calls.length;
    for (const preco of [33.4, 33.5, 33.6]) {
      fixture.componentRef.setInput('acao', { ...acao, preco });
      fixture.detectChanges();
    }
    expect(api.travar).toHaveBeenCalledTimes(travasDepoisDaOrdem);
    expect(c.ultima()).not.toBeNull();
    fixture.destroy();
  });

  it('a contagem usa a validade de 8 s a partir do recebimento (imune ao relógio do servidor)', () => {
    api.travar.mockReturnValue(of({ token: 'antigo', acaoId: 10, preco: 33.33, expiraEm: '2020-01-01T00:00:00.000Z' }));
    const c = montar().componentInstance;
    expect(c.segundosRestantes()).toBe(8);
    expect(c.expirada()).toBe(false);
  });

  it('deep link para a segunda carteira aparece selecionado no select', () => {
    api.carteiras.mockReturnValue(of([...carteiras, { id: 2, nome: 'Arrojada', descricao: null, saldo: 500, criadoEm: '', valorInvestido: 0, qtdAtivos: 0 }]));
    const fixture = TestBed.createComponent(Boleta);
    fixture.componentRef.setInput('acao', acao);
    fixture.componentRef.setInput('carteiraInicial', 2);
    fixture.detectChanges();
    fixture.detectChanges();
    const select = (fixture.nativeElement as HTMLElement).querySelector('select')!;
    expect(select.value).toBe('2');
    fixture.destroy();
  });

  it('lado da ordem é um par de botões com aria-pressed e o resumo é anunciado (aria-live)', () => {
    const fixture = montar('VENDER');
    const el = fixture.nativeElement as HTMLElement;
    const [comprar, vender] = Array.from(el.querySelectorAll<HTMLButtonElement>('.lados button'));
    expect(comprar.getAttribute('aria-pressed')).toBe('false');
    expect(vender.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('[role="tab"]')).toBeNull();
    expect(el.querySelector('.resumo')?.getAttribute('aria-live')).toBe('polite');
    fixture.destroy();
  });
});
