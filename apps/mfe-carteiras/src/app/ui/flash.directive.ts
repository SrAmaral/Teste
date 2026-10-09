import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/** Pisca verde/vermelho quando o valor sobe/desce (animação desligada por prefers-reduced-motion no CSS global). */
@Directive({ selector: '[appFlash]' })
export class FlashDirective {
  readonly appFlash = input<number | null | undefined>();
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private anterior: number | null | undefined;

  constructor() {
    effect(() => {
      const atual = this.appFlash();
      const anterior = this.anterior;
      this.anterior = atual;
      if (anterior == null || atual == null || atual === anterior) return;
      this.el.classList.remove('flash-alta', 'flash-baixa');
      void this.el.offsetWidth; // reinicia a animação
      this.el.classList.add(atual > anterior ? 'flash-alta' : 'flash-baixa');
    });
  }
}
