import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-variacao',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class.badge-alta]="valor() > 0" [class.badge-baixa]="valor() < 0">{{ valor() > 0 ? '▲' : valor() < 0 ? '▼' : '•' }} {{ abs() | number: '1.2-2' }}%</span>`,
})
export class Variacao {
  readonly valor = input.required<number>();
  protected abs(): number {
    return Math.abs(this.valor());
  }
}
