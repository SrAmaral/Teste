import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { Carteira, Compra, Posicao } from '@safra/shared';
import { filter, finalize, forkJoin, switchMap } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { DepositoDialog } from './deposito-dialog';

@Component({
  selector: 'app-carteira-detalhe',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatTableModule],
  template: `
    <a mat-button routerLink="/carteiras"><mat-icon>arrow_back</mat-icon>Carteiras</a>

    @if (carregando()) {
      <div class="estado"><mat-spinner diameter="40" /></div>
    } @else if (erro()) {
      <p class="estado">Carteira não encontrada ou API indisponível.</p>
    } @else if (carteira(); as c) {
      <header class="cabecalho">
        <div>
          <h1>{{ c.nome }}</h1>
          @if (c.descricao) { <p>{{ c.descricao }}</p> }
        </div>
        <div class="botoes">
          <a mat-stroked-button [routerLink]="['/carteiras', c.id, 'editar']"><mat-icon>edit</mat-icon>Editar</a>
          <button mat-flat-button (click)="depositar()"><mat-icon>savings</mat-icon>Depositar</button>
        </div>
      </header>

      <section class="cards">
        <mat-card appearance="outlined"><mat-card-content><span>Saldo disponível</span><strong>{{ c.saldo | currency }}</strong></mat-card-content></mat-card>
        <mat-card appearance="outlined"><mat-card-content><span>Investido</span><strong>{{ totalInvestido() | currency }}</strong></mat-card-content></mat-card>
        <mat-card appearance="outlined"><mat-card-content><span>Patrimônio (saldo + valor atual)</span><strong>{{ patrimonio() | currency }}</strong></mat-card-content></mat-card>
      </section>

      <h2>Posições</h2>
      @if (posicoes().length === 0) {
        <p class="vazio">Nenhuma ação comprada ainda. Use o menu <strong>Ações → Comprar</strong>.</p>
      } @else {
        <div class="tabela">
          <table mat-table [dataSource]="posicoes()">
            <ng-container matColumnDef="ticker"><th mat-header-cell *matHeaderCellDef>Ticker</th><td mat-cell *matCellDef="let p"><strong>{{ p.ticker }}</strong> · {{ p.nome }}</td></ng-container>
            <ng-container matColumnDef="quantidade"><th mat-header-cell *matHeaderCellDef>Qtd.</th><td mat-cell *matCellDef="let p">{{ p.quantidade | number }}</td></ng-container>
            <ng-container matColumnDef="precoMedio"><th mat-header-cell *matHeaderCellDef>Preço médio</th><td mat-cell *matCellDef="let p">{{ p.precoMedio | currency }}</td></ng-container>
            <ng-container matColumnDef="precoAtual"><th mat-header-cell *matHeaderCellDef>Preço atual</th><td mat-cell *matCellDef="let p">{{ p.precoAtual | currency }}</td></ng-container>
            <ng-container matColumnDef="valorAtual"><th mat-header-cell *matHeaderCellDef>Valor atual</th><td mat-cell *matCellDef="let p">{{ p.valorAtual | currency }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="colunasPosicoes"></tr>
            <tr mat-row *matRowDef="let linha; columns: colunasPosicoes"></tr>
          </table>
        </div>
      }

      <h2>Histórico de compras</h2>
      @if (compras().length === 0) {
        <p class="vazio">Sem compras.</p>
      } @else {
        <div class="tabela">
          <table mat-table [dataSource]="compras()">
            <ng-container matColumnDef="data"><th mat-header-cell *matHeaderCellDef>Data</th><td mat-cell *matCellDef="let co">{{ co.data | date: 'dd/MM/yyyy HH:mm' }}</td></ng-container>
            <ng-container matColumnDef="ticker"><th mat-header-cell *matHeaderCellDef>Ticker</th><td mat-cell *matCellDef="let co">{{ co.ticker }}</td></ng-container>
            <ng-container matColumnDef="quantidade"><th mat-header-cell *matHeaderCellDef>Qtd.</th><td mat-cell *matCellDef="let co">{{ co.quantidade | number }}</td></ng-container>
            <ng-container matColumnDef="precoUnitario"><th mat-header-cell *matHeaderCellDef>Preço</th><td mat-cell *matCellDef="let co">{{ co.precoUnitario | currency }}</td></ng-container>
            <ng-container matColumnDef="total"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let co">{{ co.total | currency }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="colunasCompras"></tr>
            <tr mat-row *matRowDef="let linha; columns: colunasCompras"></tr>
          </table>
        </div>
      }
    }
  `,
  styles: `
    .estado { display: flex; justify-content: center; padding: 48px 0; opacity: 0.8; }
    .cabecalho { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
    .cabecalho h1 { margin: 8px 0 0; color: var(--safra-marinho); }
    .cabecalho p { margin: 4px 0 0; opacity: 0.7; }
    .botoes { display: flex; gap: 8px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 24px 0; }
    .cards mat-card-content { display: flex; flex-direction: column; gap: 4px; }
    .cards span { font-size: 13px; opacity: 0.7; }
    .cards strong { font-size: 22px; color: var(--safra-marinho); }
    h2 { color: var(--safra-marinho); font-size: 18px; margin-top: 32px; }
    .tabela { overflow-x: auto; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
    table { width: 100%; }
    .vazio { opacity: 0.7; }
  `,
})
export class CarteiraDetalhe implements OnInit {
  readonly id = input.required<string>();

  private readonly api = inject(CarteirasApi);
  private readonly dialog = inject(MatDialog);

  readonly carteira = signal<Carteira | null>(null);
  readonly posicoes = signal<Posicao[]>([]);
  readonly compras = signal<Compra[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);

  readonly totalInvestido = computed(() => this.posicoes().reduce((soma, p) => soma + p.valorInvestido, 0));
  readonly valorAtual = computed(() => this.posicoes().reduce((soma, p) => soma + p.valorAtual, 0));
  readonly patrimonio = computed(() => (this.carteira()?.saldo ?? 0) + this.valorAtual());

  readonly colunasPosicoes = ['ticker', 'quantidade', 'precoMedio', 'precoAtual', 'valorAtual'];
  readonly colunasCompras = ['data', 'ticker', 'quantidade', 'precoUnitario', 'total'];

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    const id = Number(this.id());
    this.carregando.set(true);
    this.erro.set(false);
    forkJoin({ carteira: this.api.obter(id), posicoes: this.api.posicoes(id), compras: this.api.compras(id) })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ carteira, posicoes, compras }) => {
          this.carteira.set(carteira);
          this.posicoes.set(posicoes);
          this.compras.set(compras);
        },
        error: () => this.erro.set(true),
      });
  }

  depositar(): void {
    this.dialog
      .open<DepositoDialog, void, number>(DepositoDialog, { width: '360px' })
      .afterClosed()
      .pipe(
        filter((valor): valor is number => typeof valor === 'number' && valor > 0),
        switchMap((valor) => this.api.depositar(Number(this.id()), valor)),
      )
      .subscribe({ next: (carteira) => this.carteira.set(carteira), error: () => undefined });
  }
}
