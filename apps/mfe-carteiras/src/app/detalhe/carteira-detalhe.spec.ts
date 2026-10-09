import { vi } from 'vitest';
import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { CarteiraDetalhe } from './carteira-detalhe';

describe('CarteiraDetalhe', () => {
  const api = { obter: vi.fn(), posicoes: vi.fn(), compras: vi.fn(), depositar: vi.fn() };

  beforeAll(() => registerLocaleData(localePt));

  beforeEach(async () => {
    vi.resetAllMocks();
    await TestBed.configureTestingModule({
      imports: [CarteiraDetalhe],
      providers: [
        provideRouter([]),
        { provide: CarteirasApi, useValue: api },
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

  it('calcula investido, valor atual e patrimônio', async () => {
    api.obter.mockReturnValue(of({ id: 1, nome: 'Renda', descricao: null, saldo: 100, criadoEm: '' }));
    api.posicoes.mockReturnValue(
      of([
        { acaoId: 1, ticker: 'PETR4', nome: 'Petrobras', setor: null, quantidade: 10, precoMedio: 10, precoAtual: 12, valorInvestido: 100, valorAtual: 120, resultado: 0, resultadoPercentual: 0 },
        { acaoId: 2, ticker: 'VALE3', nome: 'Vale', setor: null, quantidade: 1, precoMedio: 50, precoAtual: 40, valorInvestido: 50, valorAtual: 40, resultado: 0, resultadoPercentual: 0 },
      ]),
    );
    api.compras.mockReturnValue(of([]));
    const fixture = await montar();
    const c = fixture.componentInstance;
    expect(c.totalInvestido()).toBe(150);
    expect(c.valorAtual()).toBe(160);
    expect(c.patrimonio()).toBe(260);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('PETR4');
  });

  it('mostra estado de erro quando a carteira não existe', async () => {
    api.obter.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    api.posicoes.mockReturnValue(of([]));
    api.compras.mockReturnValue(of([]));
    const fixture = await montar();
    expect(fixture.componentInstance.erro()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Carteira não encontrada');
  });
});
