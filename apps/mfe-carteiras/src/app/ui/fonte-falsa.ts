/** EventSource falso para testes: registra listeners e permite emitir eventos SSE. */
export class FonteFalsa {
  readonly ouvintes = new Map<string, (evento: MessageEvent<string>) => void>();
  onerror: (() => void) | null = null;
  fechada = false;

  addEventListener(tipo: string, ouvinte: (evento: MessageEvent<string>) => void): void {
    this.ouvintes.set(tipo, ouvinte);
  }

  close(): void {
    this.fechada = true;
  }

  emitir(tipo: string, dados: unknown): void {
    this.ouvintes.get(tipo)?.(new MessageEvent(tipo, { data: JSON.stringify(dados) }));
  }

  falhar(): void {
    this.onerror?.();
  }
}
