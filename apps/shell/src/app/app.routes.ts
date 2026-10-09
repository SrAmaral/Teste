import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { rotasRemotas } from './federation/remote-loader';

@Component({ selector: 'app-docs-provisorio', template: `<h1>Safra Invest Lab</h1>` })
class DocsProvisorio {}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'docs' },
  { path: 'docs', component: DocsProvisorio, title: 'Documentação · Safra Invest Lab' },
  { path: 'carteiras', loadChildren: rotasRemotas('mfe-carteiras', 'CARTEIRAS_ROUTES'), title: 'Carteiras · Safra Invest Lab' },
  { path: 'acoes', loadChildren: rotasRemotas('mfe-acoes', 'ACOES_ROUTES'), title: 'Ações · Safra Invest Lab' },
  { path: '**', redirectTo: 'docs' },
];
