import type { Trava } from '@safra/shared';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../errors';

/** Trava de cotação no estilo RFQ: o preço visto pelo usuário vale por alguns segundos, uma única vez. */
export class Travas {
  private readonly travas = new Map<string, { acaoId: number; preco: number; expiraEm: number }>();

  constructor(
    private readonly agora: () => Date = () => new Date(),
    private readonly ttlMs = 8000,
  ) {}

  criar(acaoId: number, preco: number): Trava {
    this.limparExpiradas();
    const token = randomUUID();
    const expiraEm = this.agora().getTime() + this.ttlMs;
    this.travas.set(token, { acaoId, preco, expiraEm });
    return { token, acaoId, preco, expiraEm: new Date(expiraEm).toISOString() };
  }

  consumir(token: string, acaoId: number): number {
    const trava = this.travas.get(token);
    this.travas.delete(token);
    if (!trava || trava.acaoId !== acaoId || trava.expiraEm < this.agora().getTime()) {
      throw new DomainError(409, 'COTACAO_EXPIRADA', 'A cotação travada expirou ou é inválida. Atualize e confirme novamente.');
    }
    return trava.preco;
  }

  private limparExpiradas(): void {
    const agora = this.agora().getTime();
    for (const [token, trava] of this.travas) if (trava.expiraEm < agora) this.travas.delete(token);
  }
}
