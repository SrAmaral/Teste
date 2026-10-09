import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  API_BASE_URL,
  Acao,
  AtualizaAcao,
  CarteiraResumo,
  CompraResultado,
  Cotacao,
  NovaAcao,
  NovaCompra,
  NovaVenda,
  Posicao,
  Trava,
  VendaResultado,
} from '@safra/shared';

/** Provido nas rotas do MFE (não em root): quando hospedado, o root injector é o do shell. */
@Injectable()
export class AcoesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/acoes`;

  listar() {
    return this.http.get<Acao[]>(this.base);
  }

  criar(dados: NovaAcao) {
    return this.http.post<Acao>(this.base, dados);
  }

  atualizar(id: number, dados: AtualizaAcao) {
    return this.http.put<Acao>(`${this.base}/${id}`, dados);
  }

  excluir(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  carteiras() {
    return this.http.get<CarteiraResumo[]>(`${API_BASE_URL}/carteiras`);
  }

  comprar(dados: NovaCompra) {
    return this.http.post<CompraResultado>(`${API_BASE_URL}/compras`, dados);
  }

  cotacoes() {
    return this.http.get<Cotacao[]>(`${API_BASE_URL}/cotacoes`);
  }

  travar(acaoId: number) {
    return this.http.post<Trava>(`${API_BASE_URL}/cotacoes/${acaoId}/trava`, {});
  }

  vender(dados: NovaVenda) {
    return this.http.post<VendaResultado>(`${API_BASE_URL}/vendas`, dados);
  }

  posicoes(carteiraId: number) {
    return this.http.get<Posicao[]>(`${API_BASE_URL}/carteiras/${carteiraId}/posicoes`);
  }
}
