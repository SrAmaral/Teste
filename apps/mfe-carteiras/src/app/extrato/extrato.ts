import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CarteiraResumo, FiltroExtrato, Movimentacao, Pagina } from '@safra/shared';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { EstadoVazio } from '../ui/estado-vazio';
import { filtroDeParams, paramsDeFiltro } from './filtro-extrato';

const ROTULO_TIPO = { DEPOSITO: 'Depósito', COMPRA: 'Compra', VENDA: 'Venda' } as const;

@Component({
  selector: 'app-extrato',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, MatIconModule, EstadoVazio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pagina-cabecalho">
      <div><h1>Extrato</h1><p>Depósitos, compras e vendas de todas as carteiras.</p></div>
    </header>

    @let f = filtro();
    <section class="sf-card filtros" aria-label="Filtros">
      <label>Carteira
        <select [value]="f.carteiraId ?? ''" (change)="alterar({ carteiraId: numero($any($event.target).value) })">
          <option value="">Todas</option>
          @for (c of carteiras(); track c.id) { <option [value]="c.id" [selected]="c.id === f.carteiraId">{{ c.nome }}</option> }
        </select>
      </label>
      <label>Tipo
        <select [value]="f.tipo ?? ''" (change)="alterar({ tipo: $any($event.target).value || undefined })">
          <option value="">Todos</option>
          <option value="DEPOSITO">Depósito</option>
          <option value="COMPRA">Compra</option>
          <option value="VENDA">Venda</option>
        </select>
      </label>
      <label>De <input type="date" [value]="f.de ?? ''" (change)="alterar({ de: $any($event.target).value || undefined })" /></label>
      <label>Até <input type="date" [value]="f.ate ?? ''" (change)="alterar({ ate: $any($event.target).value || undefined })" /></label>
      <label>Ticker <input type="search" placeholder="PETR4" [value]="f.ticker ?? ''" (change)="alterar({ ticker: $any($event.target).value.trim() || undefined })" /></label>
      <button class="btn" type="button" (click)="limpar()"><mat-icon>filter_alt_off</mat-icon>Limpar</button>
    </section>

    <section class="sf-card">
      @if (erro()) {
        <app-estado-vazio icone="cloud_off" titulo="Não foi possível carregar o extrato" />
      } @else if (pagina(); as p) {
        @if (p.total === 0) {
          <app-estado-vazio icone="receipt_long" titulo="Nenhuma movimentação" texto="Ajuste os filtros ou faça sua primeira ordem no Mercado." />
        } @else {
          <div class="tabela-container" [class.recarregando]="carregando()">
            <table class="tabela">
              <thead>
                <tr>
                  <th [attr.aria-sort]="ariaSort('data')"><button type="button" (click)="ordenar('data')">Data {{ seta('data') }}</button></th>
                  <th>Tipo</th><th>Carteira</th><th>Ativo</th>
                  <th class="direita">Qtd</th><th class="direita">Preço</th>
                  <th class="direita" [attr.aria-sort]="ariaSort('valor')"><button type="button" (click)="ordenar('valor')">Valor {{ seta('valor') }}</button></th>
                  <th class="direita">Resultado</th>
                </tr>
              </thead>
              <tbody>
                @for (m of p.itens; track m.id) {
                  <tr>
                    <td class="num">{{ m.data | date: 'dd/MM/yy HH:mm' }}</td>
                    <td><span class="tipo" [attr.data-tipo]="m.tipo">{{ rotulo(m) }}</span></td>
                    <td><a [routerLink]="['/carteiras', m.carteiraId]">{{ m.carteiraNome }}</a></td>
                    <td class="ticker">{{ m.ticker ?? '—' }}</td>
                    <td class="direita num">{{ m.quantidade ?? '—' }}</td>
                    <td class="direita num">{{ m.precoUnitario === null ? '—' : (m.precoUnitario | number: '1.2-2') }}</td>
                    <td class="direita num" [class.alta]="m.valor > 0" [class.baixa]="m.valor < 0">{{ m.valor > 0 ? '+' : '' }}{{ m.valor | currency }}</td>
                    <td class="direita num" [class.alta]="(m.resultado ?? 0) > 0" [class.baixa]="(m.resultado ?? 0) < 0">{{ m.resultado === null ? '—' : (m.resultado | currency) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <footer class="paginacao">
            <span class="num neutro">{{ intervalo() }}</span>
            <div>
              <button class="btn" type="button" [disabled]="p.pagina <= 1" (click)="irParaPagina(p.pagina - 1)"><mat-icon>chevron_left</mat-icon>Anterior</button>
              <button class="btn" type="button" [disabled]="p.pagina * p.tamanho >= p.total" (click)="irParaPagina(p.pagina + 1)">Próxima<mat-icon>chevron_right</mat-icon></button>
            </div>
          </footer>
        }
      } @else {
        <div class="carregando">@for (i of [1, 2, 3, 4, 5]; track i) { <span class="skeleton" style="height: 18px"></span> }</div>
      }
    </section>
  `,
  styles: `
    .filtros { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; padding: 14px 16px; margin-bottom: 12px; }
    label { display: flex; flex-direction: column; gap: 4px; color: var(--tx-3); font-size: 12px; }
    select, input { height: 34px; padding: 0 10px; border-radius: var(--raio-sm); border: 1px solid var(--sf-border-strong); background: var(--sf-bg); color: var(--tx-1); font: 500 13px var(--font-sans); color-scheme: dark; }
    .tipo { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: rgb(139 151 168 / 15%); }
    .tipo[data-tipo='COMPRA'] { color: var(--baixa); background: rgb(239 68 68 / 10%); }
    .tipo[data-tipo='VENDA'] { color: var(--alta); background: rgb(34 197 94 / 10%); }
    .tipo[data-tipo='DEPOSITO'] { color: var(--info); background: rgb(59 130 246 / 12%); }
    .paginacao { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid var(--sf-border); }
    .paginacao div { display: flex; gap: 8px; }
    .recarregando { opacity: .6; transition: opacity var(--dur-media); }
    .carregando { display: grid; gap: 12px; padding: 18px; }
  `,
})
export class ExtratoPage {
  private readonly api = inject(CarteirasApi);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  readonly filtro = toSignal(this.rota.queryParamMap.pipe(map(filtroDeParams)), { requireSync: true });
  readonly carteiras = signal<CarteiraResumo[]>([]);
  readonly pagina = signal<Pagina<Movimentacao> | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal(false);
  readonly intervalo = computed(() => {
    const p = this.pagina();
    if (!p || p.total === 0) return '';
    const inicio = (p.pagina - 1) * p.tamanho + 1;
    return `${inicio}–${Math.min(p.pagina * p.tamanho, p.total)} de ${p.total}`;
  });

  constructor() {
    this.api.listar().subscribe({ next: (lista) => this.carteiras.set(lista), error: () => undefined });
    this.rota.queryParamMap
      .pipe(
        map(filtroDeParams),
        tap(() => this.carregando.set(true)),
        switchMap((f) =>
          this.api.extrato(f).pipe(
            catchError(() => {
              this.erro.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((p) => {
        this.carregando.set(false);
        if (p) {
          this.erro.set(false);
          this.pagina.set(p);
        }
      });
  }

  alterar(parcial: FiltroExtrato): void {
    this.navegar({ ...this.filtro(), ...parcial, pagina: 1 });
  }

  irParaPagina(pagina: number): void {
    this.navegar({ ...this.filtro(), pagina });
  }

  ordenar(coluna: 'data' | 'valor'): void {
    const f = this.filtro();
    const direcao = f.ordem === coluna && f.direcao === 'desc' ? 'asc' : 'desc';
    this.navegar({ ...f, ordem: coluna, direcao, pagina: 1 });
  }

  limpar(): void {
    this.navegar({});
  }

  seta(coluna: 'data' | 'valor'): string {
    const f = this.filtro();
    return f.ordem !== coluna ? '' : f.direcao === 'asc' ? '↑' : '↓';
  }

  ariaSort(coluna: 'data' | 'valor'): string | null {
    const f = this.filtro();
    return f.ordem !== coluna ? null : f.direcao === 'asc' ? 'ascending' : 'descending';
  }

  rotulo(m: Movimentacao): string {
    return ROTULO_TIPO[m.tipo];
  }

  numero(valor: string): number | undefined {
    return valor ? Number(valor) : undefined;
  }

  private navegar(f: FiltroExtrato): void {
    void this.router.navigate([], { relativeTo: this.rota, queryParams: paramsDeFiltro(f) });
  }
}
