import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CarteiraResumo, CompraResultado, Cotacao, ORDEM_EXECUTADA_EVENT, OrdemExecutada, Posicao, Trava, VendaResultado } from '@safra/shared';
import { Observable, finalize } from 'rxjs';
import { AcoesApi } from '../data/acoes-api';
import type { Lado } from '../mercado/mercado';
import { quantidadeMaxima, quantidadePorFracao, resumoOrdem } from './calculos';

const FRACOES = [
  { rotulo: '25%', valor: 0.25 },
  { rotulo: '50%', valor: 0.5 },
  { rotulo: 'MÁX', valor: 1 },
];
const TTL_MS = 8000;

@Component({
  selector: 'app-boleta',
  imports: [CurrencyPipe, DecimalPipe, RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lados" role="group" aria-label="Lado da ordem">
      <button type="button" [attr.aria-pressed]="lado() === 'COMPRAR'" [class.ativo-compra]="lado() === 'COMPRAR'" (click)="trocarLado('COMPRAR')">Comprar</button>
      <button type="button" [attr.aria-pressed]="lado() === 'VENDER'" [class.ativo-venda]="lado() === 'VENDER'" (click)="trocarLado('VENDER')">Vender</button>
    </div>

    <label class="campo">Carteira
      <select [value]="carteiraId() ?? ''" (change)="trocarCarteira($any($event.target).value)">
        @for (c of carteiras(); track c.id) { <option [value]="c.id" [selected]="c.id === carteiraId()">{{ c.nome }} · {{ c.saldo | currency }}</option> }
      </select>
    </label>

    <label class="campo">Quantidade
      <div class="quantidade">
        <input type="number" min="1" step="1" inputmode="numeric" [value]="quantidade()" (input)="definirQuantidade($any($event.target).valueAsNumber)" aria-describedby="maximo" />
        @for (f of fracoes; track f.rotulo) {
          <button type="button" class="chip" (click)="aplicarFracao(f.valor)">{{ f.rotulo }}</button>
        }
      </div>
      <small id="maximo" class="neutro">{{ lado() === 'COMPRAR' ? 'Máximo pelo saldo' : 'Posição disponível' }}: <span class="num">{{ maximo() }}</span></small>
    </label>

    <dl class="resumo num" aria-live="polite">
      <div><dt>Preço {{ trava() && !expirada() ? 'travado' : 'de mercado' }}</dt><dd>{{ preco() | number: '1.2-2' }}</dd></div>
      <div><dt>Total</dt><dd class="destaque">{{ resumo().total | currency }}</dd></div>
      <div><dt>Saldo após</dt><dd [class.baixa]="resumo().saldoApos < 0">{{ resumo().saldoApos | currency }}</dd></div>
      @if (lado() === 'VENDER') {
        <div><dt>Resultado estimado</dt><dd [class.alta]="(resumo().resultadoEstimado ?? 0) > 0" [class.baixa]="(resumo().resultadoEstimado ?? 0) < 0">{{ resumo().resultadoEstimado === null ? '—' : (resumo().resultadoEstimado | currency) }}</dd></div>
      }
      <div class="trava">
        <dt>Cotação válida por</dt>
        <dd>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <circle cx="10" cy="10" r="8" fill="none" stroke="var(--sf-border-strong)" stroke-width="2.5" />
            <circle cx="10" cy="10" r="8" fill="none" stroke="var(--marca)" stroke-width="2.5" stroke-linecap="round" pathLength="100"
                    [attr.stroke-dasharray]="100" [attr.stroke-dashoffset]="100 - fracaoRestante() * 100" transform="rotate(-90 10 10)" />
          </svg>
          <span [class.neutro]="expirada()">{{ expirada() ? 'expirada' : segundosRestantes() + 's' }}</span>
        </dd>
      </div>
    </dl>

    @if (aviso()) { <p class="aviso" role="status">{{ aviso() }}</p> }
    @if (!resumo().valida && quantidade() > 0) { <p class="erro" role="alert">{{ resumo().motivo }}</p> }

    <button type="button" class="btn confirmar" [class.btn-compra]="lado() === 'COMPRAR'" [class.btn-venda]="lado() === 'VENDER'"
            [disabled]="!resumo().valida || enviando() || !carteiraId()" (click)="confirmar()">
      {{ expirada() ? 'Renovar cotação' : (lado() === 'COMPRAR' ? 'Confirmar compra' : 'Confirmar venda') }}
    </button>

    @if (ultima(); as o) {
      <div class="sucesso" role="status">
        <mat-icon>check_circle</mat-icon>
        <div>
          <strong>{{ o.tipo === 'COMPRA' ? 'Compra' : 'Venda' }} executada</strong>
          <span class="num">{{ o.quantidade }} × {{ o.ticker }} · {{ o.total | currency }}</span>
          <a [routerLink]="['/carteiras', o.carteiraId]">Ver carteira →</a>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 14px; }
    .lados { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--sf-border-strong); border-radius: var(--raio-sm); overflow: hidden; }
    .lados button { all: unset; text-align: center; padding: 8px; font-weight: 600; color: var(--tx-3); cursor: pointer; transition: background var(--dur-rapida); }
    .lados .ativo-compra { background: var(--alta); color: #04140a; }
    .lados .ativo-venda { background: var(--baixa); color: #1a0505; }
    .campo { display: flex; flex-direction: column; gap: 6px; color: var(--tx-3); font-size: 12px; }
    select, input { height: 36px; padding: 0 10px; border-radius: var(--raio-sm); border: 1px solid var(--sf-border-strong); background: var(--sf-bg); color: var(--tx-1); font: 500 14px var(--font-sans); color-scheme: dark; }
    .quantidade { display: flex; gap: 6px; }
    .quantidade input { flex: 1; min-width: 0; font-family: var(--font-mono); }
    .chip { all: unset; padding: 0 10px; height: 36px; display: grid; place-items: center; border: 1px solid var(--sf-border-strong); border-radius: var(--raio-sm); color: var(--tx-2); font: 600 12px var(--font-mono); cursor: pointer; }
    .chip:hover { border-color: var(--marca); color: var(--marca); }
    .resumo { margin: 0; padding-top: 12px; border-top: 1px dashed var(--sf-border-strong); display: grid; gap: 6px; }
    .resumo div { display: flex; justify-content: space-between; }
    dt { color: var(--tx-3); font-family: var(--font-sans); }
    dd { margin: 0; color: var(--tx-2); display: flex; align-items: center; gap: 6px; }
    .destaque { color: var(--tx-1); font-weight: 600; }
    .aviso { margin: 0; color: var(--marca); font-size: 13px; }
    .erro { margin: 0; color: var(--baixa); font-size: 13px; }
    .confirmar { height: 42px; font-size: 14px; }
    .sucesso { display: flex; gap: 10px; padding: 12px; border-radius: var(--raio-sm); background: rgb(34 197 94 / 8%); border: 1px solid rgb(34 197 94 / 25%); }
    .sucesso .mat-icon { color: var(--alta); }
    .sucesso div { display: flex; flex-direction: column; gap: 2px; }
    .sucesso strong { color: var(--tx-1); }
  `,
})
export class Boleta {
  readonly acao = input.required<Cotacao>();
  readonly lado = model<Lado>('COMPRAR');
  readonly carteiraInicial = input<number | null>(null);

  private readonly api = inject(AcoesApi);
  protected readonly fracoes = FRACOES;

  readonly carteiras = signal<CarteiraResumo[]>([]);
  readonly carteiraId = signal<number | null>(null);
  readonly posicoes = signal<Posicao[]>([]);
  readonly quantidade = signal(1);
  readonly trava = signal<Trava | null>(null);
  /** Expiração medida no relógio do navegador a partir do recebimento (imune a diferença de relógio com o servidor). */
  private readonly expiraLocal = signal(0);
  readonly enviando = signal(false);
  readonly aviso = signal<string | null>(null);
  readonly ultima = signal<OrdemExecutada | null>(null);
  private readonly agora = signal(Date.now());

  /** Só o id importa: ticks trazem um objeto novo da mesma ação e não devem renovar a trava. */
  private readonly acaoId = computed(() => this.acao().acaoId);
  readonly carteira = computed(() => this.carteiras().find((c) => c.id === this.carteiraId()) ?? null);
  readonly posicao = computed(() => this.posicoes().find((p) => p.acaoId === this.acao().acaoId) ?? null);
  readonly restanteMs = computed(() => {
    const t = this.trava();
    return t ? Math.max(0, this.expiraLocal() - this.agora()) : 0;
  });
  readonly expirada = computed(() => !this.trava() || this.restanteMs() === 0);
  readonly segundosRestantes = computed(() => Math.ceil(this.restanteMs() / 1000));
  readonly fracaoRestante = computed(() => this.restanteMs() / TTL_MS);
  readonly preco = computed(() => (this.trava() && !this.expirada() ? this.trava()!.preco : this.acao().preco));
  readonly maximo = computed(() => quantidadeMaxima(this.lado(), this.preco(), this.carteira()?.saldo ?? 0, this.posicao()?.quantidade ?? 0));
  readonly resumo = computed(() =>
    resumoOrdem({ lado: this.lado(), preco: this.preco(), quantidade: this.quantidade(), saldo: this.carteira()?.saldo ?? 0, posicao: this.posicao() }),
  );

  constructor() {
    const relogio = setInterval(() => this.agora.set(Date.now()), 250);
    inject(DestroyRef).onDestroy(() => clearInterval(relogio));

    this.carregarCarteiras();
    // Deep link: a carteira pedida na URL prevalece sobre a padrão.
    effect(() => {
      const inicial = this.carteiraInicial();
      if (inicial !== null) untracked(() => this.carteiraId.set(inicial));
    });
    // Troca de ação → nova trava (a trava não depende da carteira).
    effect(() => {
      const acaoId = this.acaoId();
      untracked(() => {
        this.ultima.set(null);
        this.travar(acaoId);
      });
    });
    // Troca de carteira → posição atualizada (para MÁX e resultado estimado na venda).
    effect(() => {
      const carteiraId = this.carteiraId();
      if (carteiraId) untracked(() => this.carregarPosicoes(carteiraId));
    });
  }

  trocarLado(lado: Lado): void {
    this.lado.set(lado);
    this.renovarSeExpirada();
  }

  trocarCarteira(valor: string): void {
    this.carteiraId.set(valor ? Number(valor) : null);
  }

  definirQuantidade(valor: number): void {
    this.quantidade.set(Number.isFinite(valor) ? valor : 0);
    this.renovarSeExpirada();
  }

  aplicarFracao(fracao: number): void {
    this.quantidade.set(quantidadePorFracao(this.maximo(), fracao));
    this.renovarSeExpirada();
  }

  confirmar(): void {
    if (this.expirada()) {
      this.travar(this.acao().acaoId);
      this.aviso.set('Cotação renovada — confira o preço e confirme novamente.');
      return;
    }
    const carteiraId = this.carteiraId();
    if (!carteiraId || !this.resumo().valida || this.enviando()) return;

    const ordem = { carteiraId, acaoId: this.acao().acaoId, quantidade: this.quantidade(), travaToken: this.trava()!.token };
    this.enviando.set(true);
    this.aviso.set(null);
    const requisicao: Observable<CompraResultado | VendaResultado> =
      this.lado() === 'COMPRAR' ? this.api.comprar(ordem) : this.api.vender(ordem);
    requisicao.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: (resposta) => {
        const executada: OrdemExecutada =
          'compra' in resposta
            ? { tipo: 'COMPRA', carteiraId, ticker: resposta.compra.ticker, quantidade: resposta.compra.quantidade, total: resposta.compra.total, saldoRestante: resposta.saldoRestante }
            : { tipo: 'VENDA', carteiraId, ticker: resposta.venda.ticker, quantidade: resposta.venda.quantidade, total: resposta.venda.total, saldoRestante: resposta.saldoRestante, resultado: resposta.venda.resultado };
        this.ultima.set(executada);
        // Contrato entre MFEs: o shell escuta este evento sem importar código daqui.
        window.dispatchEvent(new CustomEvent<OrdemExecutada>(ORDEM_EXECUTADA_EVENT, { detail: executada }));
        this.quantidade.set(1);
        this.carregarCarteiras();
        this.carregarPosicoes(carteiraId);
        this.travar(this.acao().acaoId);
      },
      error: (erro: HttpErrorResponse) => {
        if (erro.error?.code === 'COTACAO_EXPIRADA') {
          this.travar(this.acao().acaoId);
          this.aviso.set('Cotação renovada — confira o preço e confirme novamente.');
        }
      },
    });
  }

  private renovarSeExpirada(): void {
    if (this.expirada()) this.travar(this.acao().acaoId);
  }

  private travar(acaoId: number): void {
    this.api.travar(acaoId).subscribe({
      next: (t) => {
        this.trava.set(t);
        this.agora.set(Date.now());
        this.expiraLocal.set(Date.now() + TTL_MS);
      },
      error: () => this.trava.set(null),
    });
  }

  private carregarCarteiras(): void {
    this.api.carteiras().subscribe({
      next: (lista) => {
        this.carteiras.set(lista);
        if (this.carteiraId() === null) this.carteiraId.set(this.carteiraInicial() ?? lista[0]?.id ?? null);
      },
      error: () => undefined,
    });
  }

  private carregarPosicoes(carteiraId: number): void {
    this.api.posicoes(carteiraId).subscribe({ next: (lista) => this.posicoes.set(lista), error: () => this.posicoes.set([]) });
  }
}
