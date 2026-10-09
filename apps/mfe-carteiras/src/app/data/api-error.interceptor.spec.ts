import { vi } from 'vitest';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SILENCIOSO, apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  const open = vi.fn();

  beforeEach(() => {
    open.mockReset();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting(), { provide: MatSnackBar, useValue: { open } }],
    });
  });

  it('mostra o erro da API num snackbar', () => {
    TestBed.inject(HttpClient).get('/api/x').subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController).expectOne('/api/x').flush({ code: 'X', message: 'Falhou' }, { status: 400, statusText: 'Bad Request' });
    expect(open).toHaveBeenCalledWith('Falhou', 'Fechar', expect.anything());
  });

  it('não mostra snackbar em requisições silenciosas (atualizações em segundo plano)', () => {
    TestBed.inject(HttpClient).get('/api/x', { context: new HttpContext().set(SILENCIOSO, true) }).subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController).expectOne('/api/x').flush(null, { status: 0, statusText: 'Unknown Error' });
    expect(open).not.toHaveBeenCalled();
  });
});
