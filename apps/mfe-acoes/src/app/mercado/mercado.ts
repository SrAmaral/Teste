import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Cotacao } from '@safra/shared';
import { CotacoesStore } from '../ui/cotacoes-store';
import { EstadoVazio } from '../ui/estado-vazio';
import { FlashDirective } from '../ui/flash.directive';
import { Sparkline } from '../ui/sparkline';
import { Variacao } from '../ui/variacao';

export type Lado = 'COMPRAR' | 'VENDER';

@Component({
  selector: 'app-mercado',
  imports: [DecimalPipe, RouterLink, MatIconModule, Sparkline, Variacao, FlashDirective, EstadoVazio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pagina-cabecalho">
      <div><h1>Mercado</h1><p>Cotações simuladas em tempo real · clique em uma ação para negociar.</p></div>
      <a class="btn" routerLink="/acoes/catalogo"><mat-icon>tune</mat-icon>Gerenciar catálogo</a>
    </header>

    <div class="layout">
      <section class="sf-card">
        <div class="barra">
          <label class="busca">
            <mat-icon aria-hidden="true">search</mat-icon>
            <input type="search" placeholder="Buscar ticker ou empresa" [value]="busca()" (input)="busca.set($any($event.target).value)" aria-label="Buscar ação" />
          </label>
          <span class="status num" [class.vivo]="store.status() === 'ao-vivo'">● {{ store.status() === 'ao-vivo' ? 'ao vivo' : store.status() }}</span>
        </div>
        @if (filtradas().length === 0) {
          <app-estado-vazio icone="search_off" titulo="Nenhuma ação encontrada" />
        } @else {
          <div class="tabela-container">
            <table class="tabela">
              <thead><tr><th>Ativo</th><th class="direita">Preço</th><th class="direita">Var. dia</th><th>Intraday</th><th></th></tr></thead>
              <tbody>
                @for (c of filtradas(); track c.acaoId) {
                  <tr [class.selecionada]="c.acaoId === selecionada()?.acaoId" (click)="selecionar(c)">
                    <td><span class="ticker">{{ c.ticker }}</span><span class="sub">{{ c.nome }}</span></td>
                    <td class="direita num"><span [appFlash]="c.preco">{{ c.preco | number: '1.2-2' }}</span></td>
                    <td class="direita"><app-variacao [valor]="c.variacao" /></td>
                    <td><app-sparkline [valores]="c.historico" /></td>
                    <td class="direita"><button class="btn" type="button" (click)="selecionar(c); $event.stopPropagation()">Negociar</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <aside class="sf-card lateral" aria-label="Ordem">
        @if (selecionada(); as acao) {
          <header>
            <div><strong class="ticker">{{ acao.ticker }}</strong><span class="sub">{{ acao.nome }}</span></div>
            <strong class="num preco" [appFlash]="acao.preco">{{ acao.preco | number: '1.2-2' }}</strong>
          </header>
          <!-- boleta entra na Task 13 -->
        } @else {
          <app-estado-vazio icone="touch_app" titulo="Selecione uma ação" />
        }
      </aside>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr); gap: 12px; align-items: start; }
    .barra { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--sf-border); }
    .busca { display: flex; align-items: center; gap: 6px; flex: 1; max-width: 340px; height: 34px; padding: 0 10px; border: 1px solid var(--sf-border-strong); border-radius: var(--raio-sm); background: var(--sf-bg); }
    .busca input { all: unset; flex: 1; color: var(--tx-1); font-size: 13px; }
    .busca .mat-icon { color: var(--tx-3); font-size: 18px; width: 18px; height: 18px; }
    .status { color: var(--tx-3); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .status.vivo { color: var(--marca); }
    tbody tr { cursor: pointer; }
    tr.selecionada td { background: rgb(201 162 75 / 7%); }
    tr.selecionada td:first-child { box-shadow: inset 2px 0 0 var(--marca); }
    .lateral { position: sticky; top: 16px; padding: 16px; }
    .lateral header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
    .ticker { color: var(--tx-1); font-size: 16px; display: block; }
    .preco { font-size: 22px; color: var(--tx-1); border-radius: 4px; padding: 0 4px; }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } .lateral { position: static; } }
  `,
})
export class MercadoPage {
  protected readonly store = inject(CotacoesStore);
  private readonly consulta = inject(ActivatedRoute).snapshot.queryParamMap;

  readonly busca = signal('');
  readonly lado = signal<Lado>(this.consulta.get('lado') === 'VENDER' ? 'VENDER' : 'COMPRAR');
  readonly carteiraInicial = signal<number | null>(Number(this.consulta.get('carteira')) || null);
  private readonly selecionadaId = signal<number | null>(null);
  private readonly tickerInicial = this.consulta.get('ticker')?.toUpperCase() ?? null;

  readonly filtradas = computed(() => {
    const termo = this.busca().trim().toUpperCase();
    const lista = this.store.lista();
    return termo ? lista.filter((c) => c.ticker.includes(termo) || c.nome.toUpperCase().includes(termo)) : lista;
  });

  /** Seleção explícita > ticker do deep link > primeira da lista. */
  readonly selecionada = computed<Cotacao | null>(() => {
    const lista = this.store.lista();
    const id = this.selecionadaId();
    return (
      (id !== null ? lista.find((c) => c.acaoId === id) : undefined) ??
      (this.tickerInicial ? lista.find((c) => c.ticker === this.tickerInicial) : undefined) ??
      lista[0] ??
      null
    );
  });

  selecionar(cotacao: Cotacao): void {
    this.selecionadaId.set(cotacao.acaoId);
  }
}
