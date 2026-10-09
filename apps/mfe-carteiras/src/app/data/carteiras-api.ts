import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL, AtualizaCarteira, Carteira, CarteiraResumo, Compra, NovaCarteira, Posicao } from '@safra/shared';

/** Provido nas rotas do MFE (não em root): quando hospedado, o root injector é o do shell. */
@Injectable()
export class CarteirasApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/carteiras`;

  listar() {
    return this.http.get<CarteiraResumo[]>(this.base);
  }

  obter(id: number) {
    return this.http.get<Carteira>(`${this.base}/${id}`);
  }

  criar(dados: NovaCarteira) {
    return this.http.post<Carteira>(this.base, dados);
  }

  atualizar(id: number, dados: AtualizaCarteira) {
    return this.http.put<Carteira>(`${this.base}/${id}`, dados);
  }

  excluir(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  posicoes(id: number) {
    return this.http.get<Posicao[]>(`${this.base}/${id}/posicoes`);
  }

  compras(id: number) {
    return this.http.get<Compra[]>(`${API_BASE_URL}/compras`, { params: { carteiraId: id } });
  }

  depositar(id: number, valor: number) {
    return this.http.post<Carteira>(`${this.base}/${id}/deposito`, { valor });
  }
}
