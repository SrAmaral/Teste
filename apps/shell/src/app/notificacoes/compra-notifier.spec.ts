import { vi } from 'vitest';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { COMPRA_REALIZADA_EVENT, CompraResultado } from '@safra/shared';
import { CompraNotifier, mensagemCompra } from './compra-notifier';

const resultado: CompraResultado = {
  compra: { id: 1, carteiraId: 2, acaoId: 3, ticker: 'PETR4', quantidade: 10, precoUnitario: 38, total: 380, data: '2026-10-09 12:00:00' },
  saldoRestante: 9620,
};

describe('CompraNotifier', () => {
  beforeAll(() => registerLocaleData(localePt));

  it('formata a mensagem em pt-BR', () => {
    expect(mensagemCompra(resultado)).toMatch(/^Compra registrada: 10 × PETR4 · saldo restante R\$\s9\.620,00$/);
  });

  it('mostra snackbar ao receber safra:compra-realizada', () => {
    const open = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: MatSnackBar, useValue: { open } }] });
    TestBed.inject(CompraNotifier).iniciar();
    window.dispatchEvent(new CustomEvent(COMPRA_REALIZADA_EVENT, { detail: resultado }));
    expect(open).toHaveBeenCalledWith(mensagemCompra(resultado), 'OK', { duration: 5000 });
  });
});
