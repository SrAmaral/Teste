import { vi } from 'vitest';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Cotacao, Dashboard } from '@safra/shared';
import { of } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { CotacoesStore, FABRICA_EVENT_SOURCE } from '../ui/cotacoes-store';
import { FonteFalsa } from '../ui/fonte-falsa';
import { DashboardPage } from './dashboard';

const cotacao = (preco: number): Cotacao => ({ acaoId: 1, ticker: 'ITUB4', nome: 'Itaú', setor: 'Financeiro', preco, abertura: 11, variacao: 0, historico: [11], atualizadoEm: '' });

const dashboard: Dashboard = {
  patrimonio: 160, caixa: 50, valorMercado: 110, investido: 100, resultadoNaoRealizado: 10, resultadoRealizado: 5,
  variacaoDia: 0, variacaoDiaPercentual: 0, alocacaoPorSetor: [], alocacaoPorAtivo: [], serie: [], maioresAltas: [], maioresBaixas: [],
  posicoes: [{ acaoId: 1, ticker: 'ITUB4', nome: 'Itaú', setor: 'Financeiro', quantidade: 10, precoMedio: 10, precoAtual: 11, valorInvestido: 100, valorAtual: 110, resultado: 10, resultadoPercentual: 10 }],
};

describe('DashboardPage', () => {
  const api = { dashboard: vi.fn(), listar: vi.fn() };
  const cotacoes = signal(new Map<number, Cotacao>([[1, cotacao(12)]]));

  beforeAll(() => registerLocaleData(localePt));

  beforeEach(async () => {
    vi.resetAllMocks();
    api.dashboard.mockReturnValue(of(dashboard));
    api.listar.mockReturnValue(of([{ id: 7, nome: 'Renda', descricao: null, saldo: 50, criadoEm: '', valorInvestido: 100, qtdAtivos: 1 }]));
    cotacoes.set(new Map([[1, cotacao(12)]]));
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: CarteirasApi, useValue: api },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    })
      .overrideComponent(DashboardPage, { set: { providers: [{ provide: CotacoesStore, useValue: { cotacoes } }] } })
      .compileComponents();
  });

  it('recalcula patrimônio, resultado e variação do dia com as cotações ao vivo', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    expect(c.aoVivo()).toEqual({ valorMercado: 120, patrimonio: 170, resultadoNaoRealizado: 20, variacaoDia: 10 });
    cotacoes.set(new Map([[1, cotacao(13)]]));
    expect(c.aoVivo()?.patrimonio).toBe(180);
    fixture.destroy();
  });

  it('troca de carteira recarrega o dashboard filtrado', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(api.dashboard).toHaveBeenLastCalledWith(undefined);
    fixture.componentInstance.carteiraId.set(7);
    fixture.detectChanges();
    expect(api.dashboard).toHaveBeenLastCalledWith(7);
    fixture.destroy();
  });

  it('anuncia o patrimônio para leitores de tela (aria-live, sem anunciar cada tick)', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const regiao = (fixture.nativeElement as HTMLElement).querySelector('[aria-live="polite"]');
    expect(regiao?.textContent).toMatch(/Patrimônio R\$\s170,00/);
    fixture.destroy();
  });
});

describe('DashboardPage — conexão do stream', () => {
  it('abre o stream ao entrar e fecha ao sair da tela', async () => {
    const fontes: FonteFalsa[] = [];
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: CarteirasApi, useValue: { dashboard: () => of(dashboard), listar: () => of([]) } },
        { provide: FABRICA_EVENT_SOURCE, useValue: () => { const f = new FonteFalsa(); fontes.push(f); return f; } },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(fontes).toHaveLength(1);
    fixture.destroy();
    expect(fontes[0].fechada).toBe(true);
  });
});
