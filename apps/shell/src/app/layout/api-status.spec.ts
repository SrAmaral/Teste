import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@safra/shared';
import { ApiStatus } from './api-status';

describe('ApiStatus', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ApiStatus], providers: [provideHttpClient(), provideHttpClientTesting()] });
  });

  const proximoTick = () => new Promise((resolve) => setTimeout(resolve));

  it('começa em "Verificando API…" em vez de offline', () => {
    const fixture = TestBed.createComponent(ApiStatus);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Verificando API');
    fixture.destroy();
  });

  it('mostra online após resposta do health', async () => {
    const fixture = TestBed.createComponent(ApiStatus);
    fixture.detectChanges();
    await proximoTick();
    TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/health`).flush({ status: 'ok' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toMatch(/API online · \d+ ms/);
    fixture.destroy();
  });

  it('mostra offline quando o health falha', async () => {
    const fixture = TestBed.createComponent(ApiStatus);
    fixture.detectChanges();
    await proximoTick();
    TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/health`).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('API offline');
    fixture.destroy();
  });
});
