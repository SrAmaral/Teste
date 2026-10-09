import { Routes } from '@angular/router';
import { CARTEIRAS_ROUTES } from './carteiras.routes';

export const routes: Routes = [
  { path: 'carteiras', children: CARTEIRAS_ROUTES },
  { path: '', pathMatch: 'full', redirectTo: 'carteiras' },
];
