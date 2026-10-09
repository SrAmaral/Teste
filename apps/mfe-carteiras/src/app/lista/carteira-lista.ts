import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CarteiraResumo } from '@safra/shared';
import { filter, finalize, switchMap } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { ConfirmDialog, ConfirmacaoDados } from '../shared/confirm-dialog';
import { EstadoVazio } from '../ui/estado-vazio';

@Component({
  selector: 'app-carteira-lista',
  imports: [CurrencyPipe, RouterLink, MatIconModule, EstadoVazio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pagina-cabecalho">
      <div>
        <h1>Carteiras</h1>
        <p>Saldo, custo das posições e quantidade de ativos por carteira.</p>
      </div>
      <a class="btn btn-primario" routerLink="/carteiras/nova"><mat-icon>add</mat-icon>Nova carteira</a>
    </header>

    <section class="sf-card">
      @if (carregando()) {
        <div class="carregando">@for (i of [1, 2, 3]; track i) { <span class="skeleton" style="height: 18px"></span> }</div>
      } @else if (erro()) {
        <app-estado-vazio icone="cloud_off" titulo="Não foi possível carregar as carteiras">
          <button class="btn" type="button" (click)="carregar()">Tentar novamente</button>
        </app-estado-vazio>
      } @else if (carteiras().length === 0) {
        <app-estado-vazio icone="account_balance_wallet" titulo="Nenhuma carteira ainda" texto="Crie uma carteira para começar a investir.">
          <a class="btn btn-primario" routerLink="/carteiras/nova">Criar carteira</a>
        </app-estado-vazio>
      } @else {
        <div class="tabela-container">
          <table class="tabela">
            <thead>
              <tr><th>Carteira</th><th class="direita">Saldo</th><th class="direita">Custo das posições</th><th class="direita">Ativos</th><th></th></tr>
            </thead>
            <tbody>
              @for (c of carteiras(); track c.id) {
                <tr>
                  <td><a class="ticker" [routerLink]="['/carteiras', c.id]">{{ c.nome }}</a>@if (c.descricao) { <span class="sub">{{ c.descricao }}</span> }</td>
                  <td class="direita num">{{ c.saldo | currency }}</td>
                  <td class="direita num">{{ c.valorInvestido | currency }}</td>
                  <td class="direita num">{{ c.qtdAtivos }}</td>
                  <td class="direita">
                    <a class="btn btn-icone" [routerLink]="['/carteiras', c.id]" aria-label="Ver detalhes"><mat-icon>visibility</mat-icon></a>
                    <a class="btn btn-icone" [routerLink]="['/carteiras', c.id, 'editar']" aria-label="Editar"><mat-icon>edit</mat-icon></a>
                    <button class="btn btn-icone" type="button" (click)="excluir(c)" aria-label="Excluir"><mat-icon>delete</mat-icon></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `.carregando { display: grid; gap: 12px; padding: 18px; }`,
})
export class CarteiraLista {
  private readonly api = inject(CarteirasApi);
  private readonly dialog = inject(MatDialog);

  readonly carteiras = signal<CarteiraResumo[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);

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
