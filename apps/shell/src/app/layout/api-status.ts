import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { API_BASE_URL, Health } from '@safra/shared';
import { catchError, map, of, switchMap, timer } from 'rxjs';

@Component({
  selector: 'app-api-status',
  template: `
    <span class="status" [class.online]="online() === true" [class.verificando]="online() === null" role="status">
      <span class="ponto"></span>{{ online() === null ? 'Verificando API…' : online() ? 'API online' : 'API offline' }}
    </span>
  `,
  styles: `
    .status { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; opacity: 0.9; }
    .ponto { width: 10px; height: 10px; border-radius: 50%; background: var(--safra-erro); }
    .online .ponto { background: #4caf50; }
    .verificando .ponto { background: #9e9e9e; }
  `,
})
export class ApiStatus {
  private readonly http = inject(HttpClient);

  /** null = ainda verificando (evita mostrar "offline" antes da primeira resposta). */
  readonly online = toSignal<boolean | null>(
    timer(0, 10_000).pipe(
      switchMap(() =>
        this.http.get<Health>(`${API_BASE_URL}/health`).pipe(
          map(() => true),
          catchError(() => of(false)),
        ),
      ),
    ),
    { initialValue: null },
  );
}
