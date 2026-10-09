export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function naoEncontrado(recurso: string): DomainError {
  return new DomainError(404, 'NAO_ENCONTRADO', `${recurso} não encontrada`);
}

export function comUnicidade<T>(fn: () => T, mensagem: string): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new DomainError(409, 'DUPLICADO', mensagem);
    }
    throw err;
  }
}
