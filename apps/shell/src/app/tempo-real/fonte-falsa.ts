/** EventSource falso para testes: registra listeners e permite emitir eventos SSE. */
export class FonteFalsa {
  readonly ouvintes = new Map<string, (evento: MessageEvent<string>) => void>();
  onerror: (() => void) | null = null;
  fechada = false;
  /** 0 = CONNECTING, 1 = OPEN, 2 = CLOSED (como no EventSource). */
  readyState = 0;

  addEventListener(tipo: string, ouvinte: (evento: MessageEvent<string>) => void): void {
    this.ouvintes.set(tipo, ouvinte);
  }

  close(): void {
    this.fechada = true;
    this.readyState = 2;
  }

  emitir(tipo: string, dados: unknown): void {
    this.ouvintes.get(tipo)?.(new MessageEvent(tipo, { data: JSON.stringify(dados) }));
  }

  /** Queda transitória: o navegador tenta reconectar sozinho. */
  falhar(): void {
    this.readyState = 0;
    this.onerror?.();
  }

  /** Reconexão recusada (ex.: proxy devolvendo 502): o EventSource desiste de vez. */
  desistir(): void {
    this.readyState = 2;
    this.onerror?.();
  }
}
