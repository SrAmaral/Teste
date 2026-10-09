import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiError } from '@safra/shared';
import { catchError, throwError } from 'rxjs';

export function mensagemDeErro(err: HttpErrorResponse): string {
  if (err.status === 0) return 'API indisponível. Verifique se ela está rodando.';
  const corpo = err.error as Partial<ApiError> | null;
  const base = corpo?.message ?? 'Erro inesperado';
  const detalhes = Array.isArray(corpo?.details)
    ? (corpo.details as { mensagem?: string }[]).map((d) => d.mensagem).filter(Boolean).join('; ')
    : '';
  return detalhes ? `${base}: ${detalhes}` : base;
}

/** Requisições de atualização em segundo plano: a tela trata o erro, sem snackbar repetido. */
export const SILENCIOSO = new HttpContextToken<boolean>(() => false);

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (!req.context.get(SILENCIOSO)) snackBar.open(mensagemDeErro(err), 'Fechar', { duration: 6000, panelClass: 'snack-erro' });
      return throwError(() => err);
    }),
  );
};
