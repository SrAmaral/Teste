import type { Server } from 'node:http';
import type { Express } from 'express';

/**
 * Sobe o servidor HTTP e só resolve quando ele está de fato ouvindo.
 * No Express 5 o erro de `listen` (ex.: EADDRINUSE) vai para o callback; aqui ele vira rejeição.
 */
export function ouvir(app: Express, porta: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const servidor = app.listen(porta, (erro?: Error) => (erro ? reject(erro) : resolve(servidor)));
  });
}
