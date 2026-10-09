import { Routes } from '@angular/router';
import { ACOES_ROUTES } from './acoes.routes';

export const routes: Routes = [
  { path: 'acoes', children: ACOES_ROUTES },
  { path: '', pathMatch: 'full', redirectTo: 'acoes' },
];
