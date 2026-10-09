import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatToolbarModule],
  template: `
    <mat-toolbar class="barra">mfe-carteiras · modo standalone</mat-toolbar>
    <main class="standalone"><router-outlet /></main>
  `,
  styles: `
    .barra { background: var(--tx-1); color: #fff; }
    .standalone { padding: 24px; max-width: 1200px; margin: 0 auto; }
  `,
})
export class App {}
