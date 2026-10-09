import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { ApiStatus } from './layout/api-status';
import { TickerTape } from './layout/ticker-tape';
import { MENU } from './menu';
import { OrdemNotifier } from './notificacoes/ordem-notifier';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatIconModule, ApiStatus, TickerTape],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly menu = MENU;
  readonly mobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 900px)')
      .pipe(map((estado) => estado.matches)),
    { initialValue: false },
  );

  constructor() {
    inject(OrdemNotifier).iniciar();
  }
}
