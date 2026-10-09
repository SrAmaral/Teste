import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Acao, COMPRA_REALIZADA_EVENT, CarteiraResumo, CompraResultado } from '@safra/shared';
import { finalize, forkJoin } from 'rxjs';
import { AcoesApi } from '../data/acoes-api';

const arredondar = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

@Component({
  selector: 'app-comprar',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule],
  template: `
    @if (carregando()) {
      <div class="estado"><mat-spinner diameter="40" /></div>
    } @else if (erro()) {
      <p class="estado">Não foi possível carregar carteiras e ações. <button mat-button (click)="carregarListas()">Tentar novamente</button></p>
    } @else {
      <form [formGroup]="form" (ngSubmit)="comprar()" class="compra">
        <mat-form-field appearance="outline">
          <mat-label>Carteira</mat-label>
          <mat-select formControlName="carteiraId">
            @for (c of carteiras(); track c.id) {
              <mat-option [value]="c.id">{{ c.nome }} — saldo {{ c.saldo | currency }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ação</mat-label>
          <mat-select formControlName="acaoId">
            @for (a of acoes(); track a.id) {
              <mat-option [value]="a.id">{{ a.ticker }} · {{ a.nome }} — {{ a.preco | currency }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Quantidade</mat-label>
          <input matInput type="number" min="1" step="1" formControlName="quantidade" />
          @if (form.controls.quantidade.invalid) { <mat-error>Informe um número inteiro maior que zero.</mat-error> }
        </mat-form-field>

        <section class="resumo" aria-live="polite">
          <div><span>Total</span><strong>{{ total() | currency }}</strong></div>
          <div><span>Saldo após a compra</span><strong [class.negativo]="saldoInsuficiente()">{{ saldoApos() === null ? '—' : (saldoApos() | currency) }}</strong></div>
        </section>

        @if (saldoInsuficiente()) {
          <p class="alerta" role="alert">Saldo insuficiente para esta compra.</p>
        }

        <button mat-flat-button type="submit" data-testid="comprar" [disabled]="!podeComprar()">Comprar</button>
      </form>
    }

    @if (ultimaCompra(); as r) {
      <mat-card class="sucesso" appearance="outlined" role="status">
        <mat-card-content>
          Compra de <strong>{{ r.compra.quantidade }} × {{ r.compra.ticker }}</strong> por {{ r.compra.total | currency }} registrada.
          Saldo restante: {{ r.saldoRestante | currency }}.
        </mat-card-content>
        <mat-card-actions>
          @if (carteirasDisponivel) {
            <a mat-button [routerLink]="['/carteiras', r.compra.carteiraId]">Ver carteira</a>
          } @else {
            <span class="dica">Abra pelo shell (localhost:4200) para ver a carteira.</span>
          }
        </mat-card-actions>
      </mat-card>
    }
  `,
  styles: `
    .compra { display: flex; flex-direction: column; max-width: 560px; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); margin-top: 16px; }
    .resumo { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .resumo div { display: flex; flex-direction: column; }
    .resumo span { font-size: 13px; opacity: 0.7; }
    .resumo strong { font-size: 20px; color: var(--tx-1); }
    .resumo strong.negativo { color: var(--baixa); }
    .alerta { color: var(--baixa); margin: 0 0 16px; }
    .estado { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 48px 0; opacity: 0.8; }
    .dica { font-size: 13px; opacity: 0.7; padding: 0 8px; }
    .sucesso { max-width: 560px; margin-top: 16px; border-left: 4px solid var(--alta); }
  `,
})
export class Comprar {
  private readonly api = inject(AcoesApi);

  readonly carteiras = signal<CarteiraResumo[]>([]);
  readonly acoes = signal<Acao[]>([]);
  readonly enviando = signal(false);
  readonly ultimaCompra = signal<CompraResultado | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  /** A rota /carteiras só existe quando o MFE está hospedado no shell; no modo standalone o link não teria destino. */
  readonly carteirasDisponivel = inject(Router).config.some((r) => r.path === 'carteiras');

  readonly form = inject(NonNullableFormBuilder).group({
    carteiraId: [0, [Validators.required, Validators.min(1)]],
    acaoId: [0, [Validators.required, Validators.min(1)]],
    quantidade: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
  });

  private readonly valor = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly carteira = computed(() => this.carteiras().find((c) => c.id === Number(this.valor().carteiraId)));
  readonly acao = computed(() => this.acoes().find((a) => a.id === Number(this.valor().acaoId)));
  readonly total = computed(() => {
    const acao = this.acao();
    const quantidade = Number(this.valor().quantidade ?? 0);
    return acao && quantidade > 0 ? arredondar(acao.preco * quantidade) : 0;
  });
  readonly saldoApos = computed(() => {
    const carteira = this.carteira();
    return carteira ? arredondar(carteira.saldo - this.total()) : null;
  });
  readonly saldoInsuficiente = computed(() => {
    const carteira = this.carteira();
    return !!carteira && this.total() > carteira.saldo;
  });
  readonly podeComprar = computed(() => this.status() === 'VALID' && this.total() > 0 && !this.saldoInsuficiente() && !this.enviando());

  constructor() {
    this.carregarListas();
  }

  carregarListas(): void {
    this.carregando.set(true);
    this.erro.set(false);
    forkJoin({ carteiras: this.api.carteiras(), acoes: this.api.listar() })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ carteiras, acoes }) => {
          this.carteiras.set(carteiras);
          this.acoes.set(acoes);
        },
        error: () => this.erro.set(true),
      });
  }

  comprar(): void {
    if (!this.podeComprar()) return;
    const { carteiraId, acaoId, quantidade } = this.form.getRawValue();
    this.enviando.set(true);
    this.api
      .comprar({ carteiraId, acaoId, quantidade: Number(quantidade) })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (resultado) => {
          this.ultimaCompra.set(resultado);
          // Contrato entre MFEs: o shell (ou qualquer outro MFE) escuta este evento sem importar código daqui.
          window.dispatchEvent(new CustomEvent<CompraResultado>(COMPRA_REALIZADA_EVENT, { detail: resultado }));
          this.form.controls.quantidade.setValue(1);
          this.carregarCarteiras();
        },
        error: () => undefined,
      });
  }

  private carregarCarteiras(): void {
    this.api.carteiras().subscribe({ next: (lista) => this.carteiras.set(lista), error: () => undefined });
  }
}
