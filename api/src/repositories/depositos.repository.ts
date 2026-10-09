import type { DB } from '../db/connection';

export class DepositosRepository {
  constructor(private readonly db: DB) {}

  inserir(carteiraId: number, valor: number): void {
    this.db.prepare('INSERT INTO depositos (carteira_id, valor) VALUES (?, ?)').run(carteiraId, valor);
  }
}
