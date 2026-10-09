import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { CotacoesStore, FABRICA_EVENT_SOURCE } from './tempo-real/cotacoes-store';
import { FonteFalsa } from './tempo-real/fonte-falsa';

describe('App (shell)', () => {
  it('renderiza o menu agrupado e o ticker', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        CotacoesStore,
        { provide: FABRICA_EVENT_SOURCE, useValue: () => new FonteFalsa() },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges(); // não usar whenStable: o poll de /health fica pendente no HttpTestingController
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const rotulo of ['Investimentos', 'Dashboard', 'Carteiras', 'Mercado', 'Extrato', 'Documentação', 'CONECTANDO']) {
      expect(texto).toContain(rotulo);
    }
  });
});
