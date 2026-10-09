import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CarteirasApi } from '../data/carteiras-api';
import { CarteiraForm } from './carteira-form';

describe('CarteiraForm', () => {
  const api = { obter: vi.fn(), criar: vi.fn(), atualizar: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    await TestBed.configureTestingModule({
      imports: [CarteiraForm],
      providers: [provideRouter([]), { provide: CarteirasApi, useValue: api }],
    }).compileComponents();
  });

  function montar(id?: string) {
    const fixture = TestBed.createComponent(CarteiraForm);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('exige nome e limita a 60 caracteres', () => {
    const form = montar().form;
    form.controls.nome.setValue('');
    expect(form.controls.nome.hasError('required')).toBe(true);
    form.controls.nome.setValue('a'.repeat(61));
    expect(form.controls.nome.hasError('maxlength')).toBe(true);
  });

  it('rejeita saldo inicial negativo', () => {
    const form = montar().form;
    form.controls.saldoInicial.setValue(-1);
    expect(form.controls.saldoInicial.hasError('min')).toBe(true);
  });

  it('não envia formulário inválido', () => {
    const c = montar();
    c.salvar();
    expect(api.criar).not.toHaveBeenCalled();
    expect(c.form.controls.nome.touched).toBe(true);
  });

  it('cria e navega para o detalhe', () => {
    api.criar.mockReturnValue(of({ id: 5, nome: 'Nova', descricao: null, saldo: 100, criadoEm: '' }));
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const c = montar();
    c.form.setValue({ nome: 'Nova', descricao: '', saldoInicial: 100 });
    c.salvar();
    expect(api.criar).toHaveBeenCalledWith({ nome: 'Nova', descricao: null, saldoInicial: 100 });
    expect(navegar).toHaveBeenCalledWith(['/carteiras', 5]);
  });

  it('em edição carrega os dados e desabilita o saldo inicial', () => {
    api.obter.mockReturnValue(of({ id: 3, nome: 'Antiga', descricao: 'd', saldo: 50, criadoEm: '' }));
    const c = montar('3');
    expect(api.obter).toHaveBeenCalledWith(3);
    expect(c.form.controls.nome.value).toBe('Antiga');
    expect(c.form.controls.saldoInicial.disabled).toBe(true);
  });

  it('em edição envia só nome e descrição', () => {
    api.obter.mockReturnValue(of({ id: 3, nome: 'Antiga', descricao: null, saldo: 50, criadoEm: '' }));
    api.atualizar.mockReturnValue(of({ id: 3, nome: 'Nova', descricao: null, saldo: 50, criadoEm: '' }));
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const c = montar('3');
    c.form.controls.nome.setValue('Nova');
    c.salvar();
    expect(api.atualizar).toHaveBeenCalledWith(3, { nome: 'Nova', descricao: null });
  });
});
