import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FlashDirective } from './flash.directive';

@Component({ imports: [FlashDirective], template: `<span [appFlash]="valor()">x</span>` })
class Hospedeiro {
  readonly valor = signal<number | null>(null);
}

describe('FlashDirective', () => {
  function montar() {
    const fixture = TestBed.createComponent(Hospedeiro);
    fixture.detectChanges();
    const span = (fixture.nativeElement as HTMLElement).querySelector('span')!;
    const definir = (v: number | null) => {
      fixture.componentInstance.valor.set(v);
      fixture.detectChanges();
    };
    return { span, definir };
  }

  it('não pisca no primeiro valor', () => {
    const { span, definir } = montar();
    definir(10);
    expect(span.className).toBe('');
  });

  it('pisca verde na alta e vermelho na baixa', () => {
    const { span, definir } = montar();
    definir(10);
    definir(12);
    expect(span.classList).toContain('flash-alta');
    definir(9);
    expect(span.classList).toContain('flash-baixa');
    expect(span.classList).not.toContain('flash-alta');
  });
});
