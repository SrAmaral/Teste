import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CotacoesStore } from '../tempo-real/cotacoes-store';

@Component({
  selector: 'app-ticker-tape',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tape" aria-label="Cotações ao vivo">
      <span class="status" [class.vivo]="store.status() === 'ao-vivo'" role="status">● {{ rotuloStatus() }}</span>
      <div class="trilho">
        <div class="faixa" [style.animation-duration.s]="duracao()">
          @for (volta of voltas; track volta) {
            @for (c of store.lista(); track c.acaoId) {
              <span class="item" [attr.aria-hidden]="volta === 1">
                <b>{{ c.ticker }}</b>
                <span class="num" [class.alta]="c.variacao > 0" [class.baixa]="c.variacao < 0">
                  {{ c.preco | number: '1.2-2' }} {{ c.variacao >= 0 ? '▲' : '▼' }}{{ c.variacao | number: '1.2-2' }}%
                </span>
              </span>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .tape { display: flex; align-items: center; height: 34px; background: var(--sf-elev-1); border-bottom: 1px solid var(--sf-border); font-size: 12px; overflow: hidden; }
    .status { flex: none; padding: 0 14px; color: var(--tx-3); font: 600 11px var(--font-mono); letter-spacing: .08em; border-right: 1px solid var(--sf-border); }
    .status.vivo { color: var(--marca); }
    .trilho { flex: 1; overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); }
    .faixa { display: inline-flex; gap: 28px; padding-left: 28px; white-space: nowrap; animation: rolar linear infinite; }
    .trilho:hover .faixa { animation-play-state: paused; }
    .item b { color: var(--tx-1); margin-right: 6px; font-weight: 600; }
    @keyframes rolar { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  `,
})
export class TickerTape {
  protected readonly store = inject(CotacoesStore);
  protected readonly voltas = [0, 1];
  protected readonly duracao = computed(() => Math.max(20, this.store.lista().length * 4));
  protected readonly rotuloStatus = computed(() =>
    ({ 'ao-vivo': 'AO VIVO', conectando: 'CONECTANDO', reconectando: 'RECONECTANDO' })[this.store.status()],
  );
}
