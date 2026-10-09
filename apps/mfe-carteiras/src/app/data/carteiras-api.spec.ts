import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@safra/shared';
import { CarteirasApi } from './carteiras-api';

describe('CarteirasApi', () => {
  let api: CarteirasApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CarteirasApi, provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(CarteirasApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista carteiras', () => {
    let recebido: unknown;
    api.listar().subscribe((r) => (recebido = r));
    http.expectOne(`${API_BASE_URL}/carteiras`).flush([]);
    expect(recebido).toEqual([]);
  });

  it('cria carteira via POST', () => {
    api.criar({ nome: 'Renda', saldoInicial: 100 }).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/carteiras`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nome: 'Renda', saldoInicial: 100 });
    req.flush({});
  });

  it('atualiza via PUT e exclui via DELETE', () => {
    api.atualizar(3, { nome: 'X' }).subscribe();
    expect(http.expectOne(`${API_BASE_URL}/carteiras/3`).request.method).toBe('PUT');
    api.excluir(3).subscribe();
    expect(http.expectOne(`${API_BASE_URL}/carteiras/3`).request.method).toBe('DELETE');
  });

  it('busca compras filtrando pela carteira', () => {
    api.compras(7).subscribe();
    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/compras`);
    expect(req.request.params.get('carteiraId')).toBe('7');
    req.flush([]);
  });

  it('deposita via POST no recurso da carteira', () => {
    api.depositar(7, 50).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/carteiras/7/deposito`);
    expect(req.request.body).toEqual({ valor: 50 });
    req.flush({});
  });

  it('busca o dashboard consolidado ou de uma carteira', () => {
    api.dashboard().subscribe();
    expect(http.expectOne(`${API_BASE_URL}/dashboard`).request.params.keys()).toEqual([]);
    api.dashboard(3).subscribe();
    expect(http.expectOne((r) => r.url === `${API_BASE_URL}/dashboard`).request.params.get('carteiraId')).toBe('3');
  });

  it('busca o extrato só com os filtros definidos', () => {
    api.extrato({ carteiraId: 2, tipo: 'VENDA', ticker: undefined, pagina: 2 }).subscribe();
    const req = http.expectOne((r) => r.url === `${API_BASE_URL}/extrato`);
    expect(req.request.params.keys().sort()).toEqual(['carteiraId', 'pagina', 'tipo']);
    expect(req.request.params.get('tipo')).toBe('VENDA');
  });
});
