import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Cotacao } from '@safra/shared';
import { of } from 'rxjs';
import { AcoesApi } from '../data/acoes-api';
import { CotacoesStore, FABRICA_EVENT_SOURCE } from '../ui/cotacoes-store';
import { FonteFalsa } from '../ui/fonte-falsa';
import { Catalogo } from './catalogo';

const acao = { id: 1, ticker: 'PETR4', nome: 'Petrobras', setor: null, preco: 10, atualizadoEm: '' };
const cotacao: Cotacao = { acaoId: 1, ticker: 'PETR4', nome: 'Petrobras', setor: null, preco: 12.34, abertura: 10, variacao: 23.4, historico: [], atualizadoEm: '' };

describe('Catalogo', () => {
  beforeAll(() => registerLocaleData(localePt));

  it('mostra o preço vivo do mercado, não o preço parado do cadastro', async () => {
    await TestBed.configureTestingModule({
      imports: [Catalogo],
      providers: [provideRouter([]), { provide: AcoesApi, useValue: { listar: () => of([acao]) } }, { provide: LOCALE_ID, useValue: 'pt-BR' }, { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }],
    })
      .overrideComponent(Catalogo, { set: { providers: [{ provide: CotacoesStore, useValue: { cotacoes: signal(new Map([[1, cotacao]])) } }] } })
      .compileComponents();
    const fixture = TestBed.createComponent(Catalogo);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('12,34');
  });

  it('abre o stream ao entrar e fecha ao sair da tela', async () => {
    const fontes: FonteFalsa[] = [];
    await TestBed.configureTestingModule({
      imports: [Catalogo],
      providers: [
        provideRouter([]),
        { provide: AcoesApi, useValue: { listar: () => of([acao]) } },
        { provide: FABRICA_EVENT_SOURCE, useValue: () => { const f = new FonteFalsa(); fontes.push(f); return f; } },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Catalogo);
    fixture.detectChanges();
    expect(fontes).toHaveLength(1);
    fixture.destroy();
    expect(fontes[0].fechada).toBe(true);
  });
});
