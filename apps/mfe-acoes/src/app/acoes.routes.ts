import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { Routes } from '@angular/router';
import { AcoesPage } from './acoes-page';
import { AcoesApi } from './data/acoes-api';
import { apiErrorInterceptor } from './data/api-error.interceptor';

registerLocaleData(localePt);

/** Exposto via Native Federation como './routes'. Providers ficam aqui para valer também quando hospedado no shell. */
export const ACOES_ROUTES: Routes = [
  {
    path: '',
    providers: [
      AcoesApi,
      provideHttpClient(withFetch(), withInterceptors([apiErrorInterceptor])),
      { provide: LOCALE_ID, useValue: 'pt-BR' },
      { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    ],
    component: AcoesPage,
  },
];
