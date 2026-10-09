import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Cotacao } from '@safra/shared';
import { of } from 'rxjs';
import { AcoesApi } from '../data/acoes-api';
import { CotacoesStore } from '../ui/cotacoes-store';
import { MercadoPage } from './mercado';

const cot = (acaoId: number, ticker: string, nome: string, variacao: number): Cotacao => ({
  acaoId, ticker, nome, setor: null, preco: 10, abertura: 10, variacao, historico: [10, 10.1], atualizadoEm: '',
});

describe('MercadoPage', () => {
  beforeAll(() => registerLocaleData(localePt));

  async function montar(query: Record<string, string> = {}) {
    const lista = signal([cot(1, 'PETR4', 'Petrobras PN', 1.2), cot(2, 'VALE3', 'Vale ON', -0.8)]);
    await TestBed.configureTestingModule({
      imports: [MercadoPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) }, queryParamMap: of(convertToParamMap(query)) } },
        { provide: CotacoesStore, useValue: { lista, status: signal('ao-vivo'), cotacoes: signal(new Map()) } },
        // a boleta (filha) consulta carteiras, posições e trava — irrelevante para estes testes
        { provide: AcoesApi, useValue: { carteiras: () => of([]), posicoes: () => of([]), travar: () => of({ token: 't', acaoId: 1, preco: 10, expiraEm: new Date(Date.now() + 8000).toISOString() }) } },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(MercadoPage);
    fixture.detectChanges();
    return fixture;
  }

  it('lista as cotações ao vivo e filtra por ticker ou nome', async () => {
    const fixture = await montar();
    const c = fixture.componentInstance;
    expect(c.filtradas().map((x) => x.ticker)).toEqual(['PETR4', 'VALE3']);
    c.busca.set('vale');
    expect(c.filtradas().map((x) => x.ticker)).toEqual(['VALE3']);
  });

  it('seleciona a primeira ação por padrão e respeita o deep link', async () => {
    expect((await montar()).componentInstance.selecionada()?.ticker).toBe('PETR4');
    TestBed.resetTestingModule();
    const c = (await montar({ ticker: 'VALE3', lado: 'VENDER', carteira: '3' })).componentInstance;
    expect(c.selecionada()?.ticker).toBe('VALE3');
    expect(c.lado()).toBe('VENDER');
    expect(c.carteiraInicial()).toBe(3);
  });
});
