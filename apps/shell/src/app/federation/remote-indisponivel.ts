import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-remote-indisponivel',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <mat-card class="indisponivel" appearance="outlined">
      <mat-card-header>
        <mat-icon mat-card-avatar>cloud_off</mat-icon>
        <mat-card-title>Módulo indisponível</mat-card-title>
        <mat-card-subtitle>{{ remoteName() }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p>Não foi possível carregar este micro front-end. O restante da aplicação continua funcionando.</p>
        <p>Verifique se ele está rodando (<code>npm run dev</code>) e recarregue a página.</p>
      </mat-card-content>
      <mat-card-actions>
        <button mat-flat-button (click)="recarregar()">Recarregar</button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .indisponivel { max-width: 560px; margin: 48px auto; }
    mat-icon[mat-card-avatar] { color: var(--safra-erro); font-size: 40px; width: 40px; height: 40px; }
  `,
})
export class RemoteIndisponivel {
  readonly remoteName = input('');

  recarregar(): void {
    window.location.reload();
  }
}
