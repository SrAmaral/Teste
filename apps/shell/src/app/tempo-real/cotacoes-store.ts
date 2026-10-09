import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { COTACOES_STREAM_URL, Cotacao } from '@safra/shared';

export type StatusStream = 'conectando' | 'ao-vivo' | 'reconectando';

type FonteDeEventos = Pick<EventSource, 'addEventListener' | 'close'> & { onerror: ((this: EventSource, ev: Event) => unknown) | null };

/** Permite trocar o EventSource real por um falso nos testes. */
export const FABRICA_EVENT_SOURCE = new InjectionToken<(url: string) => FonteDeEventos>('FABRICA_EVENT_SOURCE', {
  factory: () => (url) => new EventSource(url),
});

/** Assina o stream SSE de cotações e expõe o estado como signals. Fecha a conexão junto com o injector. */
@Injectable()
export class CotacoesStore {
  private readonly mapa = signal<ReadonlyMap<number, Cotacao>>(new Map());
  readonly status = signal<StatusStream>('conectando');
  readonly cotacoes = this.mapa.asReadonly();
  readonly lista = computed(() => [...this.mapa().values()].sort((a, b) => a.ticker.localeCompare(b.ticker)));

  constructor() {
    const fonte = inject(FABRICA_EVENT_SOURCE)(COTACOES_STREAM_URL);
    const aplicar = (evento: Event, substituir: boolean) => {
      const recebidas = JSON.parse((evento as MessageEvent<string>).data) as Cotacao[];
      this.mapa.update((atual) => {
        const proximo = new Map(substituir ? [] : atual);
        for (const cotacao of recebidas) proximo.set(cotacao.acaoId, cotacao);
        return proximo;
      });
      this.status.set('ao-vivo');
    };
    fonte.addEventListener('snapshot', (e) => aplicar(e, true));
    fonte.addEventListener('cotacoes', (e) => aplicar(e, false));
    fonte.onerror = () => this.status.set('reconectando'); // o EventSource reconecta sozinho
    inject(DestroyRef).onDestroy(() => fonte.close());
  }

  cotacao(acaoId: number): Cotacao | undefined {
    return this.mapa().get(acaoId);
  }
}
