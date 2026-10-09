import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { caminhoLinha, pontosSerie } from './graficos';

@Component({
  selector: 'app-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="largura()" [attr.height]="altura()" [attr.viewBox]="'0 0 ' + largura() + ' ' + altura()" role="img" [attr.aria-label]="rotulo()">
      <path [attr.d]="caminho()" fill="none" [attr.stroke]="cor()" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  `,
  styles: `:host { display: inline-block; line-height: 0; }`,
})
export class Sparkline {
  readonly valores = input.required<number[]>();
  readonly largura = input(84);
  readonly altura = input(24);

  protected readonly caminho = computed(() => caminhoLinha(pontosSerie(this.valores(), this.largura(), this.altura())));
  private readonly tendencia = computed(() => {
    const v = this.valores();
    return v.length < 2 ? 0 : v[v.length - 1] - v[0];
  });
  protected readonly cor = computed(() => (this.tendencia() > 0 ? 'var(--alta)' : this.tendencia() < 0 ? 'var(--baixa)' : 'var(--tx-3)'));
  protected readonly rotulo = computed(() =>
    this.tendencia() > 0 ? 'Tendência de alta' : this.tendencia() < 0 ? 'Tendência de baixa' : 'Estável',
  );
}
