import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FlashDirective } from './flash.directive';

@Component({
  selector: 'app-kpi-card',
  imports: [CurrencyPipe, FlashDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="titulo">{{ titulo() }}</span>
    @if (carregando()) {
      <span class="skeleton" style="height: 26px; width: 70%"></span>
      <span class="skeleton" style="height: 12px; width: 40%"></span>
    } @else {
      <strong class="num valor" [appFlash]="valor()" [class.alta]="colorirValor() && (tendencia() ?? 0) > 0" [class.baixa]="colorirValor() && (tendencia() ?? 0) < 0">
        {{ valor() | currency }}
      </strong>
      @if (detalhe()) {
        <small class="num" [class.alta]="(tendencia() ?? 0) > 0" [class.baixa]="(tendencia() ?? 0) < 0">{{ detalhe() }}</small>
      }
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; background: var(--sf-card); border: 1px solid var(--sf-border); border-radius: var(--raio-md); min-width: 0; }
    .titulo { color: var(--tx-3); font-size: 12px; font-weight: 500; }
    .valor { color: var(--tx-1); font-size: 22px; font-weight: 600; letter-spacing: -.01em; border-radius: 4px; }
    small { color: var(--tx-3); font-size: 12px; }
  `,
})
export class KpiCard {
  readonly titulo = input.required<string>();
  readonly valor = input<number | null>(null);
  readonly detalhe = input<string | null>(null);
  readonly tendencia = input<number | null>(null);
  readonly colorirValor = input(false);
  readonly carregando = input(false);
}
