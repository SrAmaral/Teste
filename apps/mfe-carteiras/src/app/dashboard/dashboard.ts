import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CarteiraResumo, Dashboard } from '@safra/shared';
import { catchError, combineLatest, filter, interval, map, of, startWith, switchMap, tap, throttleTime } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { AreaChart } from '../ui/area-chart';
import { CotacoesStore } from '../ui/cotacoes-store';
import { Donut } from '../ui/donut';
import { EstadoVazio } from '../ui/estado-vazio';
import { KpiCard } from '../ui/kpi-card';
import { Variacao } from '../ui/variacao';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const sinal = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '');

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe, RouterLink, MatIconModule, KpiCard, AreaChart, Donut, Variacao, EstadoVazio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Stream aberto só enquanto a tela existe (fecha ao navegar para outro MFE).
  providers: [CotacoesStore],
  template: `
    <p class="sr-only" aria-live="polite">{{ anuncio() }}</p>
    <header class="pagina-cabecalho">
      <div>
        <h1>{{ titulo() }}</h1>
        <p>{{ subtitulo() }}</p>
      </div>
      <div class="acoes">
        <label class="seletor">
          <span class="sr-only">Carteira</span>
          <select [value]="carteiraId() ?? ''" (change)="selecionar($any($event.target).value)">
            <option value="">Todas as carteiras</option>
            @for (c of carteiras(); track c.id) { <option [value]="c.id">{{ c.nome }}</option> }
          </select>
        </label>
        <a class="btn btn-primario" routerLink="/acoes"><mat-icon>bolt</mat-icon>Nova ordem</a>
      </div>
    </header>

    @if (erro()) {
      <app-estado-vazio icone="cloud_off" titulo="Não foi possível carregar o dashboard" texto="Verifique se a API está rodando." />
    } @else {
      @let v = aoVivo();
      @let d = dados();
      <section class="kpis">
        <app-kpi-card titulo="Patrimônio" [valor]="v?.patrimonio ?? null" [carregando]="!d" [tendencia]="v?.variacaoDia ?? 0" [detalhe]="detalheDia()" />
        <app-kpi-card titulo="Caixa disponível" [valor]="d?.caixa ?? null" [carregando]="!d" [detalhe]="detalheCaixa()" />
        <app-kpi-card titulo="Resultado não realizado" [valor]="v?.resultadoNaoRealizado ?? null" [carregando]="!d" [tendencia]="v?.resultadoNaoRealizado ?? 0" [colorirValor]="true" [detalhe]="detalheNaoRealizado()" />
        <app-kpi-card titulo="Resultado realizado" [valor]="d?.resultadoRealizado ?? null" [carregando]="!d" [tendencia]="d?.resultadoRealizado ?? 0" [colorirValor]="true" detalhe="vendas acumuladas" />
      </section>

      <section class="grade">
        <article class="sf-card painel">
          <header><h2>Evolução no pregão</h2><span class="neutro">posições atuais × preços do dia</span></header>
          @if (d) { <app-area-chart [serie]="d.serie" /> } @else { <span class="skeleton" style="height: 180px"></span> }
        </article>
        <article class="sf-card painel">
          <header><h2>Alocação por setor</h2></header>
          @if (d) { <app-donut [fatias]="d.alocacaoPorSetor" /> } @else { <span class="skeleton" style="height: 132px"></span> }
        </article>
      </section>

      <section class="grade movimentos">
        @for (bloco of blocos(); track bloco.titulo) {
          <article class="sf-card painel">
            <header><h2>{{ bloco.titulo }}</h2><span class="neutro">do dia</span></header>
            <ul class="lista">
              @for (c of bloco.itens; track c.acaoId) {
                <li>
                  <span><b class="ticker">{{ c.ticker }}</b> <span class="neutro">{{ c.nome }}</span></span>
                  <span class="num">{{ c.preco | number: '1.2-2' }}</span>
                  <app-variacao [valor]="c.variacao" />
                </li>
              } @empty {
                <li class="neutro">Aguardando o mercado…</li>
              }
            </ul>
          </article>
        }
      </section>
    }
  `,
  styles: `
    .acoes { display: flex; gap: 10px; align-items: center; }
    select { height: 34px; padding: 0 32px 0 12px; border-radius: var(--raio-sm); border: 1px solid var(--sf-border-strong); background: var(--sf-card); color: var(--tx-1); font: 500 13px var(--font-sans); }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
    .grade { display: grid; grid-template-columns: 1.7fr 1fr; gap: 12px; margin-bottom: 12px; }
    .grade.movimentos { grid-template-columns: 1fr 1fr; }
    .painel { padding: 16px 18px; }
    .painel header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
    .painel h2 { margin: 0; font-size: 14px; }
    .lista { list-style: none; margin: 0; padding: 0; }
    .lista li { display: grid; grid-template-columns: 1fr auto 90px; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid #161c26; }
    .lista li:last-child { border-bottom: 0; }
    .ticker { color: var(--tx-1); }
    @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grade, .grade.movimentos { grid-template-columns: 1fr; } }
  `,
})
export class DashboardPage {
  private readonly api = inject(CarteirasApi);
  private readonly cotacoes = inject(CotacoesStore).cotacoes;

  readonly carteiras = signal<CarteiraResumo[]>([]);
  readonly carteiraId = signal<number | null>(null);
  readonly dados = signal<Dashboard | null>(null);
  readonly erro = signal(false);

  /** Valor de mercado recalculado a cada tick: posições (HTTP) × cotações (SSE). */
  readonly aoVivo = computed(() => {
    const d = this.dados();
    if (!d) return null;
    const mapa = this.cotacoes();
    let valorMercado = 0;
    let variacaoDia = 0;
    for (const p of d.posicoes) {
      const c = mapa.get(p.acaoId);
      const preco = c?.preco ?? p.precoAtual;
      valorMercado += p.quantidade * preco;
      variacaoDia += p.quantidade * (preco - (c?.abertura ?? preco));
    }
    const r = (n: number) => Math.round(n * 100) / 100;
    return {
      valorMercado: r(valorMercado),
      patrimonio: r(d.caixa + valorMercado),
      resultadoNaoRealizado: r(valorMercado - d.investido),
      variacaoDia: r(variacaoDia),
    };
  });

  readonly titulo = computed(() => {
    const id = this.carteiraId();
    return id === null ? 'Visão consolidada' : (this.carteiras().find((c) => c.id === id)?.nome ?? 'Carteira');
  });
  readonly subtitulo = computed(() => `${this.carteiras().length} carteira(s) · valores atualizados ao vivo`);
  readonly detalheDia = computed(() => {
    const v = this.aoVivo();
    return v ? `${sinal(v.variacaoDia)}${brl(Math.abs(v.variacaoDia))} hoje` : null;
  });
  readonly detalheCaixa = computed(() => {
    const d = this.dados();
    const v = this.aoVivo();
    return d && v && v.patrimonio > 0 ? `${Math.round((d.caixa / v.patrimonio) * 100)}% do patrimônio` : null;
  });
  readonly detalheNaoRealizado = computed(() => {
    const d = this.dados();
    const v = this.aoVivo();
    if (!d || !v || d.investido <= 0) return 'sem posições';
    const pct = (v.resultadoNaoRealizado / d.investido) * 100;
    return `${sinal(pct)}${Math.abs(pct).toFixed(2).replace('.', ',')}% sobre o custo`;
  });
  /** Resumo para leitores de tela: no máximo um anúncio por minuto, não a cada tick. */
  readonly anuncio = toSignal(
    toObservable(this.aoVivo).pipe(
      filter((v) => v !== null),
      throttleTime(60_000),
      map((v) => `Patrimônio ${brl(v!.patrimonio)}, variação do dia ${sinal(v!.variacaoDia)}${brl(Math.abs(v!.variacaoDia))}`),
    ),
    { initialValue: '' },
  );

  readonly blocos = computed(() => [
    { titulo: 'Maiores altas', itens: this.dados()?.maioresAltas ?? [] },
    { titulo: 'Maiores baixas', itens: this.dados()?.maioresBaixas ?? [] },
  ]);

  constructor() {
    this.api.listar().subscribe({ next: (lista) => this.carteiras.set(lista), error: () => undefined });
    // startWith: a primeira carga é síncrona ao toObservable emitir (sem esperar o intervalo)
    combineLatest([toObservable(this.carteiraId), interval(10_000).pipe(startWith(0))])
      .pipe(
        switchMap(([id]) =>
          this.api.dashboard(id ?? undefined).pipe(
            tap(() => this.erro.set(false)),
            catchError(() => {
              this.erro.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((d) => d && this.dados.set(d));
  }

  selecionar(valor: string): void {
    this.dados.set(null);
    this.carteiraId.set(valor ? Number(valor) : null);
  }
}
