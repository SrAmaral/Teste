import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Carteira, Movimentacao, Posicao } from '@safra/shared';
import { filter, finalize, forkJoin, switchMap } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { CotacoesStore } from '../ui/cotacoes-store';
import { EstadoVazio } from '../ui/estado-vazio';
import { FlashDirective } from '../ui/flash.directive';
import { KpiCard } from '../ui/kpi-card';
import { DepositoDialog } from './deposito-dialog';

const r = (n: number) => Math.round(n * 100) / 100;

@Component({
  selector: 'app-carteira-detalhe',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, MatIconModule, KpiCard, EstadoVazio, FlashDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Stream aberto só enquanto a tela existe.
  providers: [CotacoesStore],
  template: `
    <a class="voltar" routerLink="/carteiras/lista"><mat-icon>arrow_back</mat-icon>Carteiras</a>

    @if (erro()) {
      <app-estado-vazio icone="search_off" titulo="Carteira não encontrada ou API indisponível." />
    } @else {
      @let c = carteira();
      <header class="pagina-cabecalho">
        <div>
          <h1>{{ c?.nome ?? '…' }}</h1>
          <p>{{ c?.descricao || 'Posições e resultado atualizados ao vivo.' }}</p>
        </div>
        @if (c) {
          <div class="acoes">
            <a class="btn" [routerLink]="['/carteiras', c.id, 'editar']"><mat-icon>edit</mat-icon>Editar</a>
            <button class="btn" type="button" (click)="depositar()"><mat-icon>savings</mat-icon>Depositar</button>
            <a class="btn btn-primario" routerLink="/acoes" [queryParams]="{ carteira: c.id }"><mat-icon>bolt</mat-icon>Comprar</a>
          </div>
        }
      </header>

      <section class="kpis">
        <app-kpi-card titulo="Patrimônio" [valor]="c ? patrimonio() : null" [carregando]="carregando()" />
        <app-kpi-card titulo="Caixa disponível" [valor]="c?.saldo ?? null" [carregando]="carregando()" />
        <app-kpi-card titulo="Custo das posições" [valor]="c ? investido() : null" [carregando]="carregando()" />
        <app-kpi-card titulo="Resultado não realizado" [valor]="c ? resultado() : null" [tendencia]="resultado()" [colorirValor]="true" [carregando]="carregando()" />
      </section>

      <section class="sf-card bloco">
        <header><h2>Posições</h2><span class="neutro">custo médio · preço ao vivo</span></header>
        @if (!carregando() && posicoesAoVivo().length === 0) {
          <app-estado-vazio icone="candlestick_chart" titulo="Nenhuma posição" texto="Compre ações no Mercado para montar a carteira.">
            <a class="btn btn-primario" routerLink="/acoes">Ir ao Mercado</a>
          </app-estado-vazio>
        } @else {
          <div class="tabela-container">
            <table class="tabela">
              <thead><tr><th>Ativo</th><th class="direita">Qtd</th><th class="direita">Preço médio</th><th class="direita">Preço atual</th><th class="direita">Valor</th><th class="direita">Resultado</th><th></th></tr></thead>
              <tbody>
                @for (p of posicoesAoVivo(); track p.acaoId) {
                  <tr>
                    <td><span class="ticker">{{ p.ticker }}</span><span class="sub">{{ p.nome }}</span></td>
                    <td class="direita num">{{ p.quantidade | number }}</td>
                    <td class="direita num">{{ p.precoMedio | number: '1.2-2' }}</td>
                    <td class="direita num"><span [appFlash]="p.precoAtual">{{ p.precoAtual | number: '1.2-2' }}</span></td>
                    <td class="direita num">{{ p.valorAtual | currency }}</td>
                    <td class="direita num" [class.alta]="p.resultado > 0" [class.baixa]="p.resultado < 0">
                      {{ p.resultado | currency }} <small>({{ p.resultadoPercentual | number: '1.2-2' }}%)</small>
                    </td>
                    <td class="direita">
                      <a class="btn" data-testid="vender" routerLink="/acoes" [queryParams]="{ ticker: p.ticker, lado: 'VENDER', carteira: c?.id }">Vender</a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <section class="sf-card bloco">
        <header><h2>Últimas movimentações</h2><a [routerLink]="['/carteiras/extrato']" [queryParams]="{ carteiraId: c?.id }">Ver extrato completo →</a></header>
        <ul class="movs">
          @for (m of movimentacoes(); track m.id) {
            <li>
              <span class="num neutro">{{ m.data | date: 'dd/MM HH:mm' }}</span>
              <span>{{ m.tipo === 'DEPOSITO' ? 'Depósito' : (m.tipo === 'COMPRA' ? 'Compra ' : 'Venda ') + m.ticker }}</span>
              <span class="num" [class.alta]="m.valor > 0" [class.baixa]="m.valor < 0">{{ m.valor > 0 ? '+' : '' }}{{ m.valor | currency }}</span>
            </li>
          } @empty {
            <li class="neutro">Sem movimentações.</li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .voltar { display: inline-flex; align-items: center; gap: 4px; color: var(--tx-3); margin-bottom: 12px; }
    .voltar .mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .acoes { display: flex; gap: 8px; flex-wrap: wrap; }
    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
    .bloco { margin-bottom: 12px; }
    .bloco > header { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 16px 6px; }
    .bloco h2 { margin: 0; font-size: 14px; }
    .movs { list-style: none; margin: 0; padding: 0 16px 8px; }
    .movs li { display: grid; grid-template-columns: 110px 1fr auto; gap: 12px; padding: 8px 0; border-bottom: 1px solid #161c26; }
    .movs li:last-child { border-bottom: 0; }
    small { color: var(--tx-3); }
    @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `,
})
export class CarteiraDetalhe implements OnInit {
  readonly id = input.required<string>();

  private readonly api = inject(CarteirasApi);
  private readonly dialog = inject(MatDialog);
  private readonly cotacoes = inject(CotacoesStore).cotacoes;

  readonly carteira = signal<Carteira | null>(null);
  readonly posicoes = signal<Posicao[]>([]);
  readonly movimentacoes = signal<Movimentacao[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);

  /** Posições (HTTP) reprecificadas a cada tick do stream. */
  readonly posicoesAoVivo = computed(() =>
    this.posicoes().map((p) => {
      const precoAtual = this.cotacoes().get(p.acaoId)?.preco ?? p.precoAtual;
      const valorAtual = r(p.quantidade * precoAtual);
      const resultado = r(valorAtual - p.valorInvestido);
      return { ...p, precoAtual, valorAtual, resultado, resultadoPercentual: p.valorInvestido > 0 ? r((resultado / p.valorInvestido) * 100) : 0 };
    }),
  );
  readonly investido = computed(() => r(this.posicoesAoVivo().reduce((s, p) => s + p.valorInvestido, 0)));
  readonly resultado = computed(() => r(this.posicoesAoVivo().reduce((s, p) => s + p.resultado, 0)));
  readonly patrimonio = computed(() => r((this.carteira()?.saldo ?? 0) + this.posicoesAoVivo().reduce((s, p) => s + p.valorAtual, 0)));

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    const id = Number(this.id());
    this.carregando.set(true);
    this.erro.set(false);
    forkJoin({ carteira: this.api.obter(id), posicoes: this.api.posicoes(id), extrato: this.api.extrato({ carteiraId: id, tamanho: 8 }) })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ carteira, posicoes, extrato }) => {
          this.carteira.set(carteira);
          this.posicoes.set(posicoes);
          this.movimentacoes.set(extrato.itens);
        },
        error: () => this.erro.set(true),
      });
  }

  depositar(): void {
    this.dialog
      .open<DepositoDialog, void, number>(DepositoDialog, { width: '380px' })
      .afterClosed()
      .pipe(
        filter((valor): valor is number => typeof valor === 'number' && valor > 0),
        switchMap((valor) => this.api.depositar(Number(this.id()), valor)),
      )
      .subscribe({ next: () => this.carregar(), error: () => undefined });
  }
}
