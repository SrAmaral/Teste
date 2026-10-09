import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Acao, NovaAcao } from '@safra/shared';
import { filter, finalize, switchMap } from 'rxjs';
import { AcoesApi } from '../data/acoes-api';
import { ConfirmDialog, ConfirmacaoDados } from '../shared/confirm-dialog';
import { AcaoDialog } from './acao-dialog';

@Component({
  selector: 'app-catalogo',
  imports: [CurrencyPipe, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="barra">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filtro">
        <mat-label>Filtrar por ticker ou nome</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [value]="filtro()" (input)="filtro.set($any($event.target).value)" />
      </mat-form-field>
      <button mat-flat-button (click)="abrir(null)"><mat-icon>add</mat-icon>Nova ação</button>
    </div>

    @if (carregando()) {
      <div class="estado"><mat-spinner diameter="40" /></div>
    } @else if (erro()) {
      <p class="estado">Não foi possível carregar as ações. <button mat-button (click)="carregar()">Tentar novamente</button></p>
    } @else if (filtradas().length === 0) {
      <p class="estado">Nenhuma ação encontrada.</p>
    } @else {
      <div class="tabela">
        <table mat-table [dataSource]="filtradas()">
          <ng-container matColumnDef="ticker"><th mat-header-cell *matHeaderCellDef>Ticker</th><td mat-cell *matCellDef="let a"><strong>{{ a.ticker }}</strong></td></ng-container>
          <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Nome</th><td mat-cell *matCellDef="let a">{{ a.nome }}</td></ng-container>
          <ng-container matColumnDef="setor"><th mat-header-cell *matHeaderCellDef>Setor</th><td mat-cell *matCellDef="let a">{{ a.setor ?? '—' }}</td></ng-container>
          <ng-container matColumnDef="preco"><th mat-header-cell *matHeaderCellDef>Preço</th><td mat-cell *matCellDef="let a">{{ a.preco | currency }}</td></ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let a" class="acoes">
              <button mat-icon-button (click)="abrir(a)" matTooltip="Editar" aria-label="Editar"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button (click)="excluir(a)" matTooltip="Excluir" aria-label="Excluir"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let linha; columns: colunas"></tr>
        </table>
      </div>
    }
  `,
  styles: `
    .barra { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
    .filtro { flex: 1; max-width: 360px; }
    .estado { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 48px 0; opacity: 0.8; }
    .tabela { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
    table { width: 100%; }
    td.acoes { text-align: right; white-space: nowrap; }
  `,
})
export class Catalogo {
  private readonly api = inject(AcoesApi);
  private readonly dialog = inject(MatDialog);

  readonly acoes = signal<Acao[]>([]);
  readonly filtro = signal('');
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly colunas = ['ticker', 'nome', 'setor', 'preco', 'acoes'];

  readonly filtradas = computed(() => {
    const termo = this.filtro().trim().toUpperCase();
    if (!termo) return this.acoes();
    return this.acoes().filter((a) => a.ticker.includes(termo) || a.nome.toUpperCase().includes(termo));
  });

  constructor() {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.api
      .listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({ next: (lista) => this.acoes.set(lista), error: () => this.erro.set(true) });
  }

  abrir(acao: Acao | null): void {
    this.dialog
      .open<AcaoDialog, Acao | null, NovaAcao>(AcaoDialog, { data: acao, width: '440px' })
      .afterClosed()
      .pipe(
        filter((dados): dados is NovaAcao => !!dados),
        switchMap((dados) => (acao ? this.api.atualizar(acao.id, dados) : this.api.criar(dados))),
      )
      .subscribe({ next: () => this.carregar(), error: () => undefined });
  }

  excluir(acao: Acao): void {
    this.dialog
      .open<ConfirmDialog, ConfirmacaoDados, boolean>(ConfirmDialog, {
        data: { titulo: 'Excluir ação', mensagem: `Excluir ${acao.ticker} do catálogo?`, confirmar: 'Excluir' },
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.excluir(acao.id)),
      )
      .subscribe({ next: () => this.carregar(), error: () => undefined });
  }
}
