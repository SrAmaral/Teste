import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AcaoDialog } from './acao-dialog';

describe('AcaoDialog', () => {
  const close = vi.fn();

  async function montar(data: unknown = null) {
    close.mockReset();
    await TestBed.configureTestingModule({
      imports: [AcaoDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AcaoDialog);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('rejeita ticker fora do padrão', async () => {
    const c = await montar();
    c.form.controls.ticker.setValue('PETRO');
    expect(c.form.controls.ticker.hasError('pattern')).toBe(true);
  });

  it('normaliza ticker para maiúsculas sem espaços ao salvar', async () => {
    const c = await montar();
    c.form.setValue({ ticker: ' petr4 ', nome: 'Petrobras PN', setor: '', preco: 38.42 });
    c.salvar();
    expect(close).toHaveBeenCalledWith({ ticker: 'PETR4', nome: 'Petrobras PN', setor: null, preco: 38.42 });
  });

  it('não fecha com preço zero', async () => {
    const c = await montar();
    c.form.setValue({ ticker: 'PETR4', nome: 'Petrobras PN', setor: '', preco: 0 });
    c.salvar();
    expect(close).not.toHaveBeenCalled();
  });

  it('em edição preenche com a ação existente', async () => {
    const c = await montar({ id: 1, ticker: 'VALE3', nome: 'Vale ON', setor: 'Mineração', preco: 61.15, atualizadoEm: '' });
    expect(c.form.getRawValue()).toEqual({ ticker: 'VALE3', nome: 'Vale ON', setor: 'Mineração', preco: 61.15 });
  });
});
