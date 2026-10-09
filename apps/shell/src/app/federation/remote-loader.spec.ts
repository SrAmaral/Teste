import { vi } from 'vitest';
import { Routes } from '@angular/router';
import { rotasRemotas } from './remote-loader';
import { RemoteIndisponivel } from './remote-indisponivel';

describe('rotasRemotas', () => {
  it('retorna as rotas exportadas pelo remote', async () => {
    const rotas: Routes = [{ path: '' }];
    const carregar = rotasRemotas('mfe-x', 'X_ROUTES', async () => ({ X_ROUTES: rotas }));
    expect(await carregar()).toBe(rotas);
  });

  it('usa a rota de fallback quando o remote está fora do ar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rotas = await rotasRemotas('mfe-x', 'X_ROUTES', () => Promise.reject(new Error('offline')))();
    expect(rotas).toEqual([{ path: '**', component: RemoteIndisponivel, data: { remoteName: 'mfe-x' } }]);
  });

  it('usa a rota de fallback quando o export não existe', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rotas = await rotasRemotas('mfe-x', 'X_ROUTES', async () => ({ OUTRO: [] }))();
    expect(rotas[0].component).toBe(RemoteIndisponivel);
  });
});
