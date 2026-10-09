import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Acao, AtualizaAcao, NovaAcao } from '@safra/shared';

@Component({
  selector: 'app-acao-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ acao ? 'Editar ação' : 'Nova ação' }}</h2>
    <form [formGroup]="form" (ngSubmit)="salvar()">
      <mat-dialog-content class="campos">
        <mat-form-field appearance="outline">
          <mat-label>Ticker</mat-label>
          <input matInput formControlName="ticker" placeholder="PETR4" class="maiusculas" />
          @if (form.controls.ticker.invalid) { <mat-error>Use 4 letras + 1 ou 2 dígitos (ex.: PETR4).</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" />
          @if (form.controls.nome.invalid) { <mat-error>Informe o nome (até 80 caracteres).</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Setor</mat-label>
          <input matInput formControlName="setor" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Preço</mat-label>
          <span matTextPrefix>R$&nbsp;</span>
          <input matInput type="number" min="0.01" step="0.01" formControlName="preco" />
          @if (form.controls.preco.invalid) { <mat-error>O preço deve ser maior que zero.</mat-error> }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit">Salvar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .campos { display: flex; flex-direction: column; min-width: 320px; }
    .maiusculas { text-transform: uppercase; }
  `,
})
export class AcaoDialog {
  readonly acao = inject<Acao | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<AcaoDialog, NovaAcao | AtualizaAcao>>(MatDialogRef);

  readonly form = inject(NonNullableFormBuilder).group({
    ticker: [this.acao?.ticker ?? '', [Validators.required, Validators.pattern(/^\s*[A-Za-z]{4}\d{1,2}\s*$/)]],
    nome: [this.acao?.nome ?? '', [Validators.required, Validators.maxLength(80)]],
    setor: [this.acao?.setor ?? '', Validators.maxLength(40)],
    preco: [this.acao?.preco ?? 0, [Validators.required, Validators.min(0.01)]],
  });

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { ticker, nome, setor, preco } = this.form.getRawValue();
    const dados = { ticker: ticker.trim().toUpperCase(), nome: nome.trim(), setor: setor.trim() || null };
    // Na edição, sem mudar o preço, não o envia: a API mantém o preço vivo do mercado.
    this.ref.close(this.acao && preco === this.acao.preco ? dados : { ...dados, preco });
  }
}
