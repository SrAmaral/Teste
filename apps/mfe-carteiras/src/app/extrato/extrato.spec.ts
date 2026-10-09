import { vi } from 'vitest';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { ExtratoPage } from './extrato';

describe('ExtratoPage', () => {
  const api = { extrato: vi.fn(), listar: vi.fn() };
  const query = new BehaviorSubject(convertToParamMap({ tipo: 'COMPRA', pagina: '1' }));

  beforeAll(() => registerLocaleData(localePt));

  beforeEach(async () => {
    vi.resetAllMocks();
    api.listar.mockReturnValue(of([]));
    api.extrato.mockReturnValue(
      of({
        itens: [{ id: 'C-1', tipo: 'COMPRA', carteiraId: 1, carteiraNome: 'A', ticker: 'PETR4', quantidade: 2, precoUnitario: 10, valor: -20, resultado: null, data: '2026-10-09T12:00:00Z' }],
        total: 45, pagina: 1, tamanho: 20,
      }),
    );
    await TestBed.configureTestingModule({
      imports: [ExtratoPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: query } },
        { provide: CarteirasApi, useValue: api },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();
  });

  it('busca com o filtro da URL e mostra o intervalo paginado', () => {
    const fixture = TestBed.createComponent(ExtratoPage);
    fixture.detectChanges();
    expect(api.extrato).toHaveBeenCalledWith({ tipo: 'COMPRA', ordem: 'data', direcao: 'desc', pagina: 1, tamanho: 20 });
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('1–20 de 45');
    expect(texto).toContain('PETR4');
  });

  it('próxima página e ordenação atualizam a URL', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ExtratoPage);
    fixture.detectChanges();
    fixture.componentInstance.irParaPagina(2);
    expect(navegar).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { tipo: 'COMPRA', pagina: 2 } }));
    fixture.componentInstance.ordenar('valor');
    expect(navegar).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { tipo: 'COMPRA', ordem: 'valor' } }));
  });
});
