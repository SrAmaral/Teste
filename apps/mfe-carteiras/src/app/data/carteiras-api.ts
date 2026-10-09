import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  API_BASE_URL,
  AtualizaCarteira,
  Carteira,
  CarteiraResumo,
  Compra,
  Dashboard,
  FiltroExtrato,
  Movimentacao,
  NovaCarteira,
  Pagina,
  Posicao,
} from '@safra/shared';
import { SILENCIOSO } from './api-error.interceptor';

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

  dashboard(carteiraId?: number) {
    // atualizado a cada 10 s: a tela mostra o estado de erro, sem snackbar a cada tentativa
    return this.http.get<Dashboard>(`${API_BASE_URL}/dashboard`, {
      params: carteiraId ? { carteiraId } : {},
      context: new HttpContext().set(SILENCIOSO, true),
    });
  }

  extrato(filtro: FiltroExtrato) {
    // fuso do navegador: o filtro de período considera o dia local do usuário
    let params = new HttpParams().set('fuso', String(-new Date().getTimezoneOffset()));
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor !== undefined && valor !== null && valor !== '') params = params.set(chave, String(valor));
    }
    return this.http.get<Pagina<Movimentacao>>(`${API_BASE_URL}/extrato`, { params });
  }
}
