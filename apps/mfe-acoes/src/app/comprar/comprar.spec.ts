import { vi } from 'vitest';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Acao, COMPRA_REALIZADA_EVENT, CarteiraResumo, CompraResultado } from '@safra/shared';
import { of } from 'rxjs';
import { AcoesApi } from '../data/acoes-api';
import { Comprar } from './comprar';

const carteiras: CarteiraResumo[] = [{ id: 1, nome: 'Conservadora', descricao: null, saldo: 100, criadoEm: '', valorInvestido: 0, qtdAtivos: 0 }];
const acoes: Acao[] = [{ id: 10, ticker: 'PETR4', nome: 'Petrobras PN', setor: null, preco: 33.33, atualizadoEm: '' }];

describe('Comprar', () => {
  const api = { carteiras: vi.fn(), listar: vi.fn(), comprar: vi.fn() };

  beforeAll(() => registerLocaleData(localePt));

  beforeEach(async () => {
    vi.resetAllMocks();
    api.carteiras.mockReturnValue(of(carteiras));
    api.listar.mockReturnValue(of(acoes));
    await TestBed.configureTestingModule({
      imports: [Comprar],
      providers: [
        provideRouter([]),
        { provide: AcoesApi, useValue: api },
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
      ],
    }).compileComponents();
  });

  async function montar() {
    const fixture = TestBed.createComponent(Comprar);
    await fixture.whenStable();
    return fixture;
  }

  it('calcula total arredondado e saldo após a compra', async () => {
    const c = (await montar()).componentInstance;
    c.form.setValue({ carteiraId: 1, acaoId: 10, quantidade: 3 });
    expect(c.total()).toBe(99.99);
    expect(c.saldoApos()).toBe(0.01);
    expect(c.saldoInsuficiente()).toBe(false);
    expect(c.podeComprar()).toBe(true);
  });

  it('desabilita a compra quando o saldo não cobre o total', async () => {
    const fixture = await montar();
    const c = fixture.componentInstance;
    c.form.setValue({ carteiraId: 1, acaoId: 10, quantidade: 4 });
    await fixture.whenStable();
    expect(c.saldoInsuficiente()).toBe(true);
    expect(c.podeComprar()).toBe(false);
    const botao = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="comprar"]');
    expect(botao?.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Saldo insuficiente');
  });

  it('rejeita quantidade fracionada', async () => {
    const c = (await montar()).componentInstance;
    c.form.setValue({ carteiraId: 1, acaoId: 10, quantidade: 1.5 });
    expect(c.podeComprar()).toBe(false);
  });

  it('compra, guarda o resultado e dispara safra:compra-realizada', async () => {
    const resultado: CompraResultado = {
      compra: { id: 7, carteiraId: 1, acaoId: 10, ticker: 'PETR4', quantidade: 3, precoUnitario: 33.33, total: 99.99, data: '' },
      saldoRestante: 0.01,
    };
    api.comprar.mockReturnValue(of(resultado));
    const ouvinte = vi.fn();
    window.addEventListener(COMPRA_REALIZADA_EVENT, ouvinte);

    const c = (await montar()).componentInstance;
    c.form.setValue({ carteiraId: 1, acaoId: 10, quantidade: 3 });
    c.comprar();

    window.removeEventListener(COMPRA_REALIZADA_EVENT, ouvinte);
    expect(api.comprar).toHaveBeenCalledWith({ carteiraId: 1, acaoId: 10, quantidade: 3 });
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect((ouvinte.mock.calls[0][0] as CustomEvent<CompraResultado>).detail).toEqual(resultado);
    expect(c.ultimaCompra()).toEqual(resultado);
    expect(api.carteiras).toHaveBeenCalledTimes(2);
  });

  it('não chama a API quando não pode comprar', async () => {
    const c = (await montar()).componentInstance;
    c.comprar();
    expect(api.comprar).not.toHaveBeenCalled();
  });
});
