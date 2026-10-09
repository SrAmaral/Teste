import { Routes } from '@angular/router';
import { DocsPage } from './docs/docs-page';
import { rotasRemotas } from './federation/remote-loader';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'docs' },
  { path: 'docs', component: DocsPage, title: 'Documentação · Safra Invest Lab' },
  { path: 'docs/:slug', component: DocsPage, title: 'Documentação · Safra Invest Lab' },
  { path: 'carteiras', loadChildren: rotasRemotas('mfe-carteiras', 'CARTEIRAS_ROUTES'), title: 'Carteiras · Safra Invest Lab' },
  { path: 'acoes', loadChildren: rotasRemotas('mfe-acoes', 'ACOES_ROUTES'), title: 'Ações · Safra Invest Lab' },
  { path: '**', redirectTo: 'docs' },
];
