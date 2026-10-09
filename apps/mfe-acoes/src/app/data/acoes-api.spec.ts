import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@safra/shared';
import { AcoesApi } from './acoes-api';

describe('AcoesApi', () => {
  let api: AcoesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AcoesApi, provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AcoesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista ações', () => {
    api.listar().subscribe();
    expect(http.expectOne(`${API_BASE_URL}/acoes`).request.method).toBe('GET');
  });

  it('cria, atualiza e exclui', () => {
    const nova = { ticker: 'PETR4', nome: 'Petrobras', preco: 10 };
    api.criar(nova).subscribe();
    expect(http.expectOne(`${API_BASE_URL}/acoes`).request.body).toEqual(nova);
    api.atualizar(2, nova).subscribe();
    expect(http.expectOne(`${API_BASE_URL}/acoes/2`).request.method).toBe('PUT');
    api.excluir(2).subscribe();
    expect(http.expectOne(`${API_BASE_URL}/acoes/2`).request.method).toBe('DELETE');
  });

  it('lê carteiras da API (sem depender do mfe-carteiras)', () => {
    api.carteiras().subscribe();
    expect(http.expectOne(`${API_BASE_URL}/carteiras`).request.method).toBe('GET');
  });

  it('compra via POST /compras', () => {
    api.comprar({ carteiraId: 1, acaoId: 2, quantidade: 3 }).subscribe();
    const req = http.expectOne(`${API_BASE_URL}/compras`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ carteiraId: 1, acaoId: 2, quantidade: 3 });
  });
});
