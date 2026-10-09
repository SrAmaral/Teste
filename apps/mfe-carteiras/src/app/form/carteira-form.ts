import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { Carteira } from '@safra/shared';
import { Observable, finalize } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';

@Component({
  selector: 'app-carteira-form',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule],
  template: `
    <h1>{{ editando() ? 'Editar carteira' : 'Nova carteira' }}</h1>
    <form [formGroup]="form" (ngSubmit)="salvar()" class="formulario">
      <mat-form-field appearance="outline">
        <mat-label>Nome</mat-label>
        <input matInput formControlName="nome" />
        @if (form.controls.nome.hasError('required')) { <mat-error>Informe o nome.</mat-error> }
        @if (form.controls.nome.hasError('maxlength')) { <mat-error>Máximo de 60 caracteres.</mat-error> }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Descrição</mat-label>
        <textarea matInput rows="3" formControlName="descricao"></textarea>
        @if (form.controls.descricao.hasError('maxlength')) { <mat-error>Máximo de 200 caracteres.</mat-error> }
      </mat-form-field>

      @if (!editando()) {
        <mat-form-field appearance="outline">
          <mat-label>Saldo inicial</mat-label>
          <span matTextPrefix>R$&nbsp;</span>
          <input matInput type="number" min="0" step="0.01" formControlName="saldoInicial" />
          @if (form.controls.saldoInicial.invalid) { <mat-error>Informe um valor maior ou igual a zero.</mat-error> }
        </mat-form-field>
      }

      <div class="botoes">
        <a class="btn" routerLink="/carteiras/lista">Cancelar</a>
        <button class="btn btn-primario" type="submit" [disabled]="salvando()">Salvar</button>
      </div>
    </form>
  `,
  styles: `
    h1 { color: var(--tx-1); }
    .formulario { display: flex; flex-direction: column; max-width: 520px; background: var(--sf-card); border: 1px solid var(--sf-border); padding: 24px; border-radius: var(--raio-md); }
    .botoes { display: flex; justify-content: flex-end; gap: 8px; }
  `,
})
export class CarteiraForm implements OnInit {
  readonly id = input<string>();

  private readonly api = inject(CarteirasApi);
  private readonly router = inject(Router);

  readonly editando = computed(() => !!this.id());
  readonly salvando = signal(false);
  readonly form = inject(NonNullableFormBuilder).group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    descricao: ['', Validators.maxLength(200)],
    saldoInicial: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.form.controls.saldoInicial.disable();
    this.api.obter(Number(id)).subscribe({
      next: (c) => this.form.patchValue({ nome: c.nome, descricao: c.descricao ?? '' }),
      error: () => undefined,
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nome, descricao, saldoInicial } = this.form.getRawValue();
    const id = this.id();
    const requisicao: Observable<Carteira> = id
      ? this.api.atualizar(Number(id), { nome, descricao: descricao || null })
      : this.api.criar({ nome, descricao: descricao || null, saldoInicial });

    this.salvando.set(true);
    requisicao.pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: (carteira) => void this.router.navigate(['/carteiras', carteira.id]),
      error: () => undefined,
    });
  }
}
