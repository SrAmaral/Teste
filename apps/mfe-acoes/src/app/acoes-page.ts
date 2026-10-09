import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { Catalogo } from './catalogo/catalogo';

@Component({
  selector: 'app-acoes-page',
  imports: [MatTabsModule, Catalogo],
  template: `
    <h1>Ações</h1>
    <p class="subtitulo">Mantenha o catálogo de ações e registre compras nas carteiras.</p>
    <mat-tab-group animationDuration="150ms">
      <mat-tab label="Catálogo"><ng-template matTabContent><app-catalogo /></ng-template></mat-tab>
    </mat-tab-group>
  `,
  styles: `
    h1 { margin: 0; color: var(--safra-marinho); }
    .subtitulo { margin: 4px 0 16px; opacity: 0.7; }
  `,
})
export class AcoesPage {}
