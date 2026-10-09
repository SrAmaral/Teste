import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { API_BASE_URL, Health } from '@safra/shared';
import { catchError, map, of, switchMap, timer } from 'rxjs';

interface Estado {
  online: boolean;
  ms: number | null;
}

@Component({
  selector: 'app-api-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let e = estado();
    <span class="status" [class.online]="e?.online === true" [class.verificando]="e === null" role="status">
      <span class="ponto"></span>
      @if (e === null) { Verificando API… } @else if (e.online) { API online · {{ e.ms }} ms } @else { API offline }
    </span>
  `,
  styles: `
    .status { display: inline-flex; align-items: center; gap: 8px; font: 500 12px var(--font-mono); color: var(--tx-3); }
    .ponto { width: 8px; height: 8px; border-radius: 50%; background: var(--baixa); box-shadow: 0 0 0 3px rgb(239 68 68 / 15%); }
    .online .ponto { background: var(--alta); box-shadow: 0 0 0 3px rgb(34 197 94 / 15%); }
    .verificando .ponto { background: var(--tx-3); box-shadow: none; }
  `,
})
export class ApiStatus {
  private readonly http = inject(HttpClient);

  /** null = ainda verificando (evita mostrar "offline" antes da primeira resposta). */
  readonly estado = toSignal<Estado | null>(
    timer(0, 10_000).pipe(
      switchMap(() => {
        const inicio = performance.now();
        return this.http.get<Health>(`${API_BASE_URL}/health`).pipe(
          map(() => ({ online: true, ms: Math.round(performance.now() - inicio) })),
          catchError(() => of({ online: false, ms: null })),
        );
      }),
    ),
    { initialValue: null },
  );
}
