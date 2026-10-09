import { vi } from 'vitest';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ORDEM_EXECUTADA_EVENT, OrdemExecutada } from '@safra/shared';
import { OrdemNotifier, mensagemOrdem } from './ordem-notifier';

const compra: OrdemExecutada = { tipo: 'COMPRA', carteiraId: 1, ticker: 'PETR4', quantidade: 10, total: 384.2, saldoRestante: 615.8 };
const venda: OrdemExecutada = { tipo: 'VENDA', carteiraId: 1, ticker: 'PETR4', quantidade: 4, total: 60, saldoRestante: 960, resultado: -12.5 };

describe('OrdemNotifier', () => {
  beforeAll(() => registerLocaleData(localePt));

  it('descreve compra e venda (com resultado e sinal)', () => {
    expect(mensagemOrdem(compra)).toMatch(/^Compra executada: 10 × PETR4 por R\$\s384,20$/);
    expect(mensagemOrdem(venda)).toMatch(/^Venda executada: 4 × PETR4 por R\$\s60,00 · resultado −R\$\s12,50$/);
    expect(mensagemOrdem({ ...venda, resultado: 3 })).toContain('resultado +R$');
  });

  it('mostra snackbar ao receber safra:ordem-executada', () => {
    const open = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: { open } }] });
    TestBed.inject(OrdemNotifier).iniciar();
    window.dispatchEvent(new CustomEvent(ORDEM_EXECUTADA_EVENT, { detail: venda }));
    expect(open).toHaveBeenCalledWith(mensagemOrdem(venda), 'OK', { duration: 5000, panelClass: 'snack-sucesso' });
  });
});
