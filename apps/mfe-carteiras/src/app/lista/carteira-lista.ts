import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { CarteiraResumo } from '@safra/shared';
import { filter, finalize, switchMap } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { ConfirmDialog, ConfirmacaoDados } from '../shared/confirm-dialog';

@Component({
  selector: 'app-carteira-lista',
  imports: [CurrencyPipe, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <header class="cabecalho">
      <div>
        <h1>Carteiras</h1>
        <p>Cadastre carteiras e acompanhe saldo e posições.</p>
      </div>
      <a mat-flat-button routerLink="/carteiras/nova"><mat-icon>add</mat-icon>Nova carteira</a>
    </header>

    @if (carregando()) {
      <div class="estado"><mat-spinner diameter="40" /></div>
    } @else if (erro()) {
      <p class="estado">Não foi possível carregar as carteiras. <button mat-button (click)="carregar()">Tentar novamente</button></p>
    } @else if (carteiras().length === 0) {
      <p class="estado">Nenhuma carteira cadastrada ainda.</p>
    } @else {
      <div class="tabela">
        <table mat-table [dataSource]="carteiras()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let c"><a [routerLink]="['/carteiras', c.id]">{{ c.nome }}</a></td>
          </ng-container>
          <ng-container matColumnDef="saldo">
            <th mat-header-cell *matHeaderCellDef>Saldo</th>
            <td mat-cell *matCellDef="let c">{{ c.saldo | currency }}</td>
          </ng-container>
          <ng-container matColumnDef="valorInvestido">
            <th mat-header-cell *matHeaderCellDef>Investido</th>
            <td mat-cell *matCellDef="let c">{{ c.valorInvestido | currency }}</td>
          </ng-container>
          <ng-container matColumnDef="qtdAtivos">
            <th mat-header-cell *matHeaderCellDef>Ativos</th>
            <td mat-cell *matCellDef="let c">{{ c.qtdAtivos }}</td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let c" class="acoes">
              <a mat-icon-button [routerLink]="['/carteiras', c.id]" matTooltip="Ver detalhes" aria-label="Ver detalhes"><mat-icon>visibility</mat-icon></a>
              <a mat-icon-button [routerLink]="['/carteiras', c.id, 'editar']" matTooltip="Editar" aria-label="Editar"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button (click)="excluir(c)" matTooltip="Excluir" aria-label="Excluir"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let linha; columns: colunas"></tr>
        </table>
      </div>
    }
  `,
  styles: `
    .cabecalho { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .cabecalho h1 { margin: 0; color: var(--safra-marinho); }
    .cabecalho p { margin: 4px 0 0; opacity: 0.7; }
    .estado { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 48px 0; opacity: 0.8; }
    .tabela { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
    table { width: 100%; }
    td.acoes { text-align: right; white-space: nowrap; }
    a { color: var(--safra-marinho); font-weight: 500; }
  `,
})
export class CarteiraLista {
  private readonly api = inject(CarteirasApi);
  private readonly dialog = inject(MatDialog);

  readonly carteiras = signal<CarteiraResumo[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly colunas = ['nome', 'saldo', 'valorInvestido', 'qtdAtivos', 'acoes'];

  constructor() {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.api
      .listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({ next: (lista) => this.carteiras.set(lista), error: () => this.erro.set(true) });
  }

  excluir(carteira: CarteiraResumo): void {
    this.dialog
      .open<ConfirmDialog, ConfirmacaoDados, boolean>(ConfirmDialog, {
        data: { titulo: 'Excluir carteira', mensagem: `Excluir "${carteira.nome}"? Esta ação não pode ser desfeita.`, confirmar: 'Excluir' },
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.excluir(carteira.id)),
      )
      .subscribe({ next: () => this.carregar(), error: () => undefined });
  }
}
