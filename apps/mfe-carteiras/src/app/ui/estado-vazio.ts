import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-estado-vazio',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-icon aria-hidden="true">{{ icone() }}</mat-icon>
    <strong>{{ titulo() }}</strong>
    @if (texto()) { <p>{{ texto() }}</p> }
    <ng-content />
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px; text-align: center; color: var(--tx-3); }
    mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--sf-border-strong); }
    strong { color: var(--tx-1); }
    p { margin: 0; max-width: 360px; }
  `,
})
export class EstadoVazio {
  readonly icone = input('inbox');
  readonly titulo = input.required<string>();
  readonly texto = input<string | null>(null);
}
