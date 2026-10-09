import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { COTACOES_STREAM_URL, Cotacao } from '@safra/shared';

export type StatusStream = 'conectando' | 'ao-vivo' | 'reconectando';

type FonteDeEventos = Pick<EventSource, 'addEventListener' | 'close' | 'readyState'> & {
  onerror: ((this: EventSource, ev: Event) => unknown) | null;
};

const FECHADO = 2; // EventSource.CLOSED
const ESPERA_MAXIMA_MS = 15_000;

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

  private readonly criarFonte = inject(FABRICA_EVENT_SOURCE);
  private fonte: FonteDeEventos | null = null;
  private tentativas = 0;
  private religar: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.conectar();
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.religar);
      this.fonte?.close();
    });
  }

  cotacao(acaoId: number): Cotacao | undefined {
    return this.mapa().get(acaoId);
  }

  private conectar(): void {
    const fonte = this.criarFonte(COTACOES_STREAM_URL);
    this.fonte = fonte;
    const aplicar = (evento: Event, substituir: boolean) => {
      const recebidas = JSON.parse((evento as MessageEvent<string>).data) as Cotacao[];
      this.mapa.update((atual) => {
        const proximo = new Map(substituir ? [] : atual);
        for (const cotacao of recebidas) proximo.set(cotacao.acaoId, cotacao);
        return proximo;
      });
      this.tentativas = 0;
      this.status.set('ao-vivo');
    };
    fonte.addEventListener('snapshot', (e) => aplicar(e, true));
    fonte.addEventListener('cotacoes', (e) => aplicar(e, false));
    fonte.onerror = () => {
      this.status.set('reconectando');
      // Quedas curtas o próprio EventSource resolve. Se a reconexão receber erro HTTP (ex.: proxy 502
      // enquanto a API reinicia), ele desiste de vez (CLOSED): recriamos com espera exponencial.
      if (fonte.readyState !== FECHADO) return;
      fonte.close();
      const espera = Math.min(1000 * 2 ** this.tentativas++, ESPERA_MAXIMA_MS);
      this.religar = setTimeout(() => this.conectar(), espera);
    };
  }
}
