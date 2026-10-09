import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FatiaAlocacao } from '@safra/shared';
import { arcosDonut } from './graficos';

export const CORES_DONUT = ['#c9a24b', '#3b82f6', '#22c55e', '#a78bfa', '#f97316', '#14b8a6', '#e879f9', '#8b97a8'];

@Component({
  selector: 'app-donut',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fatias().length === 0) {
      <p class="vazio">Sem posições para alocar.</p>
    } @else {
      <div class="donut">
        <svg viewBox="0 0 120 120" width="132" height="132" role="img" [attr.aria-label]="rotulo()">
          @for (caminho of arcos(); track $index) {
            <path [attr.d]="caminho" [attr.fill]="cor($index)" [attr.opacity]="destaque() === null || destaque() === $index ? 1 : 0.35"
                  (mouseenter)="destaque.set($index)" (mouseleave)="destaque.set(null)" />
          }
          <text x="60" y="56" text-anchor="middle" class="centro-valor">{{ centro().valor }}</text>
          <text x="60" y="72" text-anchor="middle" class="centro-rotulo">{{ centro().rotulo }}</text>
        </svg>
        <ul>
          @for (f of fatias(); track f.nome) {
            <li (mouseenter)="destaque.set($index)" (mouseleave)="destaque.set(null)" [class.ativo]="destaque() === $index">
              <span class="cor" [style.background]="cor($index)"></span>
              <span class="nome">{{ f.nome }}</span>
              <span class="num">{{ f.percentual | number: '1.1-1' }}%</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    .donut { display: flex; align-items: center; gap: 20px; }
    path { transition: opacity var(--dur-media); cursor: pointer; }
    .centro-valor { fill: var(--tx-1); font: 600 15px var(--font-mono); }
    .centro-rotulo { fill: var(--tx-3); font: 500 9px var(--font-sans); text-transform: uppercase; letter-spacing: .08em; }
    ul { list-style: none; margin: 0; padding: 0; flex: 1; display: grid; gap: 6px; }
    li { display: grid; grid-template-columns: 10px 1fr auto; gap: 8px; align-items: center; padding: 2px 6px; border-radius: 4px; }
    li.ativo { background: rgb(255 255 255 / 4%); }
    .cor { width: 10px; height: 10px; border-radius: 3px; }
    .nome { color: var(--tx-2); }
    .vazio { color: var(--tx-3); margin: 24px 0; }
  `,
})
export class Donut {
  readonly fatias = input.required<FatiaAlocacao[]>();
  protected readonly destaque = signal<number | null>(null);
  protected readonly arcos = computed(() => arcosDonut(this.fatias().map((f) => f.valor), 56, 14, 60));
  protected readonly centro = computed(() => {
    const i = this.destaque();
    if (i === null) return { valor: `${this.fatias().length}`, rotulo: this.fatias().length === 1 ? 'grupo' : 'grupos' };
    return { valor: `${Math.round(this.fatias()[i].percentual)}%`, rotulo: this.fatias()[i].nome };
  });
  protected readonly rotulo = computed(() => this.fatias().map((f) => `${f.nome} ${f.percentual}%`).join(', '));

  protected cor(indice: number): string {
    return CORES_DONUT[indice % CORES_DONUT.length];
  }
}
