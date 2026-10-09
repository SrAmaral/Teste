import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { API_BASE_URL, Health } from '@safra/shared';
import { catchError, map, of, switchMap, timer } from 'rxjs';

@Component({
  selector: 'app-api-status',
  template: `
    <span class="status" [class.online]="online()" role="status">
      <span class="ponto"></span>{{ online() ? 'API online' : 'API offline' }}
    </span>
  `,
  styles: `
    .status { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; opacity: 0.9; }
    .ponto { width: 10px; height: 10px; border-radius: 50%; background: var(--safra-erro); }
    .online .ponto { background: #4caf50; }
  `,
})
export class ApiStatus {
  private readonly http = inject(HttpClient);

  readonly online = toSignal(
    timer(0, 10_000).pipe(
      switchMap(() =>
        this.http.get<Health>(`${API_BASE_URL}/health`).pipe(
          map(() => true),
          catchError(() => of(false)),
        ),
      ),
    ),
    { initialValue: false },
  );
}
