import { formatCurrency } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { COMPRA_REALIZADA_EVENT, CompraResultado } from '@safra/shared';
import { fromEvent } from 'rxjs';

export function mensagemCompra({ compra, saldoRestante }: CompraResultado): string {
  const saldo = formatCurrency(saldoRestante, 'pt-BR', 'R$', 'BRL');
  return `Compra registrada: ${compra.quantidade} × ${compra.ticker} · saldo restante ${saldo}`;
}

/** Escuta o evento global emitido pelo mfe-acoes — o shell não importa código do remote. */
@Injectable({ providedIn: 'root' })
export class CompraNotifier {
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  iniciar(): void {
    fromEvent<CustomEvent<CompraResultado>>(window, COMPRA_REALIZADA_EVENT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => this.snackBar.open(mensagemCompra(evento.detail), 'OK', { duration: 5000 }));
  }
}
