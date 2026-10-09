import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Acao, AtualizaAcao, NovaAcao } from '@safra/shared';
import { filter, finalize, switchMap } from 'rxjs';
import { AcoesApi } from '../data/acoes-api';
import { ConfirmDialog, ConfirmacaoDados } from '../shared/confirm-dialog';
import { CotacoesStore } from '../ui/cotacoes-store';
import { EstadoVazio } from '../ui/estado-vazio';
import { AcaoDialog } from './acao-dialog';

@Component({
  selector: 'app-catalogo',
  imports: [CurrencyPipe, RouterLink, MatIconModule, EstadoVazio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // preço vivo do mercado; stream aberto só enquanto a tela existe
  providers: [CotacoesStore],
  template: `
    <a class="voltar" routerLink="/acoes"><mat-icon>arrow_back</mat-icon>Mercado</a>
    <header class="pagina-cabecalho">
      <div><h1>Catálogo de ações</h1><p>Ativos disponíveis para negociação.</p></div>
      <button class="btn btn-primario" type="button" (click)="abrir(null)"><mat-icon>add</mat-icon>Nova ação</button>
    </header>

    <section class="sf-card">
      <div class="barra">
        <label class="busca">
          <mat-icon aria-hidden="true">search</mat-icon>
          <input type="search" placeholder="Filtrar por ticker ou nome" [value]="filtro()" (input)="filtro.set($any($event.target).value)" aria-label="Filtrar ações" />
        </label>
        <span class="neutro num">{{ filtradas().length }} ativo(s)</span>
      </div>

      @if (carregando()) {
        <div class="carregando">@for (i of [1, 2, 3, 4]; track i) { <span class="skeleton" style="height: 18px"></span> }</div>
      } @else if (erro()) {
        <app-estado-vazio icone="cloud_off" titulo="Não foi possível carregar as ações">
          <button class="btn" type="button" (click)="carregar()">Tentar novamente</button>
        </app-estado-vazio>
      } @else if (filtradas().length === 0) {
        <app-estado-vazio icone="search_off" titulo="Nenhuma ação encontrada" />
      } @else {
        <div class="tabela-container">
          <table class="tabela">
            <thead><tr><th>Ticker</th><th>Nome</th><th>Setor</th><th class="direita">Preço</th><th></th></tr></thead>
            <tbody>
              @for (a of filtradas(); track a.id) {
                <tr>
                  <td class="ticker">{{ a.ticker }}</td>
                  <td>{{ a.nome }}</td>
                  <td class="neutro">{{ a.setor ?? '—' }}</td>
                  <td class="direita num">{{ precoVivo(a) | currency }}</td>
                  <td class="direita">
                    <button class="btn btn-icone" type="button" (click)="abrir(a)" aria-label="Editar"><mat-icon>edit</mat-icon></button>
                    <button class="btn btn-icone" type="button" (click)="excluir(a)" aria-label="Excluir"><mat-icon>delete</mat-icon></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .voltar { display: inline-flex; align-items: center; gap: 4px; color: var(--tx-3); margin-bottom: 12px; }
    .voltar .mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .barra { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--sf-border); }
    .busca { display: flex; align-items: center; gap: 6px; flex: 1; max-width: 340px; height: 34px; padding: 0 10px; border: 1px solid var(--sf-border-strong); border-radius: var(--raio-sm); background: var(--sf-bg); }
    .busca input { all: unset; flex: 1; color: var(--tx-1); font-size: 13px; }
    .busca .mat-icon { color: var(--tx-3); font-size: 18px; width: 18px; height: 18px; }
    .carregando { display: grid; gap: 12px; padding: 18px; }
  `,
})
export class Catalogo {
  private readonly api = inject(AcoesApi);
  private readonly dialog = inject(MatDialog);
  private readonly cotacoes = inject(CotacoesStore).cotacoes;

  readonly acoes = signal<Acao[]>([]);
  readonly filtro = signal('');
  readonly carregando = signal(true);
  readonly erro = signal(false);

  readonly filtradas = computed(() => {
    const termo = this.filtro().trim().toUpperCase();
    if (!termo) return this.acoes();
    return this.acoes().filter((a) => a.ticker.includes(termo) || a.nome.toUpperCase().includes(termo));
  });

  constructor() {
    this.carregar();
  }

  /** O cadastro guarda o último preço gravado; a tela mostra o do stream quando disponível. */
  precoVivo(acao: Acao): number {
    return this.cotacoes().get(acao.id)?.preco ?? acao.preco;
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.api
      .listar()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({ next: (lista) => this.acoes.set(lista), error: () => this.erro.set(true) });
  }

  abrir(acao: Acao | null): void {
    this.dialog
      .open<AcaoDialog, Acao | null, NovaAcao | AtualizaAcao>(AcaoDialog, { data: acao && { ...acao, preco: this.precoVivo(acao) }, width: '440px' })
      .afterClosed()
      .pipe(
        filter((dados): dados is NovaAcao | AtualizaAcao => !!dados),
        switchMap((dados) => (acao ? this.api.atualizar(acao.id, dados) : this.api.criar(dados as NovaAcao))),
      )
      .subscribe({ next: () => this.carregar(), error: () => undefined });
  }

  excluir(acao: Acao): void {
    this.dialog
      .open<ConfirmDialog, ConfirmacaoDados, boolean>(ConfirmDialog, {
        data: { titulo: 'Excluir ação', mensagem: `Excluir ${acao.ticker} do catálogo?`, confirmar: 'Excluir' },
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.excluir(acao.id)),
      )
      .subscribe({ next: () => this.carregar(), error: () => undefined });
  }
}
