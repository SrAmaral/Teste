import { formatCurrency } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ORDEM_EXECUTADA_EVENT, OrdemExecutada } from '@safra/shared';
import { fromEvent } from 'rxjs';

const brl = (valor: number) => formatCurrency(valor, 'pt-BR', 'R$', 'BRL');

export function mensagemOrdem(o: OrdemExecutada): string {
  const base = `${o.tipo === 'COMPRA' ? 'Compra' : 'Venda'} executada: ${o.quantidade} × ${o.ticker} por ${brl(o.total)}`;
  if (o.tipo === 'COMPRA' || o.resultado === undefined) return base;
  return `${base} · resultado ${o.resultado >= 0 ? '+' : '−'}${brl(Math.abs(o.resultado))}`;
}

/** Escuta o evento global emitido pelos MFEs — o shell não importa código dos remotes. */
@Injectable({ providedIn: 'root' })
export class OrdemNotifier {
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  iniciar(): void {
    fromEvent<CustomEvent<OrdemExecutada>>(window, ORDEM_EXECUTADA_EVENT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => this.snackBar.open(mensagemOrdem(evento.detail), 'OK', { duration: 5000, panelClass: 'snack-sucesso' }));
  }
}
