import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { PontoSerie } from '@safra/shared';
import { caminhoArea, caminhoLinha, pontosSerie } from './graficos';

const LARGURA = 600;
const ALTURA = 180;
let sequencia = 0;

@Component({
  selector: 'app-area-chart',
  imports: [CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grafico" (mousemove)="mover($event)" (mouseleave)="foco.set(null)">
      @if (serie().length < 2) {
        <p class="vazio">Coletando pontos do pregão…</p>
      } @else {
        <svg [attr.viewBox]="'0 0 ' + largura + ' ' + altura" preserveAspectRatio="none" role="img" aria-label="Evolução do patrimônio no pregão">
          <defs>
            <linearGradient [attr.id]="idGradiente" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#c9a24b" stop-opacity="0.32" />
              <stop offset="1" stop-color="#c9a24b" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path [attr.d]="area()" [attr.fill]="'url(#' + idGradiente + ')'" />
          <path [attr.d]="linha()" fill="none" stroke="var(--marca)" stroke-width="2" vector-effect="non-scaling-stroke" />
          @if (pontoFoco(); as p) {
            <line [attr.x1]="p.x" [attr.x2]="p.x" y1="0" [attr.y2]="altura" stroke="var(--sf-border-strong)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
          }
        </svg>
        @if (itemFoco(); as item) {
          <div class="dica" [style.left.%]="posicaoFoco()">
            <span class="num">{{ item.valor | currency }}</span>
            <small>{{ item.t | date: 'HH:mm:ss' }}</small>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .grafico { position: relative; height: 180px; }
    svg { width: 100%; height: 100%; display: block; }
    .vazio { display: grid; place-items: center; height: 100%; margin: 0; color: var(--tx-3); }
    .dica { position: absolute; top: 4px; transform: translateX(-50%); padding: 6px 10px; border-radius: var(--raio-sm); background: #0a0d12; border: 1px solid var(--sf-border-strong); pointer-events: none; white-space: nowrap; display: flex; flex-direction: column; }
    .dica .num { color: var(--tx-1); }
    .dica small { color: var(--tx-3); font-size: 11px; }
  `,
})
export class AreaChart {
  readonly serie = input.required<PontoSerie[]>();
  protected readonly largura = LARGURA;
  protected readonly altura = ALTURA;
  protected readonly idGradiente = `area-gradiente-${++sequencia}`;
  protected readonly foco = signal<number | null>(null);

  private readonly pontos = computed(() => pontosSerie(this.serie().map((p) => p.valor), LARGURA, ALTURA, 6));
  protected readonly linha = computed(() => caminhoLinha(this.pontos()));
  protected readonly area = computed(() => caminhoArea(this.pontos(), ALTURA));
  protected readonly pontoFoco = computed(() => (this.foco() === null ? null : this.pontos()[this.foco()!]));
  protected readonly itemFoco = computed(() => (this.foco() === null ? null : this.serie()[this.foco()!]));
  protected readonly posicaoFoco = computed(() => ((this.pontoFoco()?.x ?? 0) / LARGURA) * 100);

  protected mover(evento: MouseEvent): void {
    const n = this.serie().length;
    if (n < 2) return;
    const caixa = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    const fracao = Math.min(Math.max((evento.clientX - caixa.left) / caixa.width, 0), 1);
    this.foco.set(Math.round(fracao * (n - 1)));
  }
}
