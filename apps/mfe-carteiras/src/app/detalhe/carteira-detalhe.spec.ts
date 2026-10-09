import { vi } from 'vitest';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Cotacao, Posicao } from '@safra/shared';
import { of, throwError } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { CotacoesStore } from '../ui/cotacoes-store';
import { CarteiraDetalhe } from './carteira-detalhe';

const posicao: Posicao = { acaoId: 1, ticker: 'PETR4', nome: 'Petrobras', setor: null, quantidade: 10, precoMedio: 10, precoAtual: 12, valorInvestido: 100, valorAtual: 120, resultado: 20, resultadoPercentual: 20 };
const cotacao = (preco: number): Cotacao => ({ acaoId: 1, ticker: 'PETR4', nome: 'Petrobras', setor: null, preco, abertura: 12, variacao: 0, historico: [], atualizadoEm: '' });

describe('CarteiraDetalhe', () => {
  const api = { obter: vi.fn(), posicoes: vi.fn(), extrato: vi.fn(), depositar: vi.fn() };
  const cotacoes = signal(new Map<number, Cotacao>());

  beforeAll(() => registerLocaleData(localePt));

  beforeEach(async () => {
    vi.resetAllMocks();
    cotacoes.set(new Map());
    api.extrato.mockReturnValue(of({ itens: [], total: 0, pagina: 1, tamanho: 10 }));
    await TestBed.configureTestingModule({
      imports: [CarteiraDetalhe],
      providers: [
        provideRouter([]),
        { provide: CarteirasApi, useValue: api },
        { provide: CotacoesStore, useValue: { cotacoes } },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();
  });

  async function montar() {
    const fixture = TestBed.createComponent(CarteiraDetalhe);
    fixture.componentRef.setInput('id', '1');
    await fixture.whenStable();
    return fixture;
  }

  it('recalcula posições e patrimônio com as cotações ao vivo', async () => {
    api.obter.mockReturnValue(of({ id: 1, nome: 'Renda', descricao: null, saldo: 100, criadoEm: '' }));
    api.posicoes.mockReturnValue(of([posicao]));
    const fixture = await montar();
    const c = fixture.componentInstance;
    expect(c.patrimonio()).toBe(220);
    cotacoes.set(new Map([[1, cotacao(15)]]));
    expect(c.posicoesAoVivo()[0]).toMatchObject({ precoAtual: 15, valorAtual: 150, resultado: 50, resultadoPercentual: 50 });
    expect(c.patrimonio()).toBe(250);
  });

  it('link de vender leva ao mercado com ticker, lado e carteira', async () => {
    api.obter.mockReturnValue(of({ id: 1, nome: 'Renda', descricao: null, saldo: 100, criadoEm: '' }));
    api.posicoes.mockReturnValue(of([posicao]));
    const fixture = await montar();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a[data-testid="vender"]');
    expect(link?.getAttribute('href')).toBe('/acoes?ticker=PETR4&lado=VENDER&carteira=1');
  });

  it('mostra estado de erro quando a carteira não existe', async () => {
    api.obter.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    api.posicoes.mockReturnValue(of([]));
    const fixture = await montar();
    expect(fixture.componentInstance.erro()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Carteira não encontrada');
  });
});
