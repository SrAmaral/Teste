import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { Routes } from '@angular/router';
import { apiErrorInterceptor } from './data/api-error.interceptor';
import { CarteirasApi } from './data/carteiras-api';
import { CarteiraForm } from './form/carteira-form';
import { CarteiraLista } from './lista/carteira-lista';

registerLocaleData(localePt);

/** Exposto via Native Federation como './routes'. Providers ficam aqui para valer também quando hospedado no shell. */
export const CARTEIRAS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      CarteirasApi,
      provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
      { provide: LOCALE_ID, useValue: 'pt-BR' },
      { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    ],
    children: [
      { path: '', component: CarteiraLista },
      { path: 'nova', component: CarteiraForm },
      { path: ':id/editar', component: CarteiraForm },
    ],
  },
];
