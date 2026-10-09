import type { Acao } from '@safra/shared';
import { comUnicidade, DomainError, naoEncontrado } from '../errors';
import type { AcoesRepository } from '../repositories/acoes.repository';
import type { AcaoInput, AtualizaAcaoInput } from '../schemas/acoes';

const TICKER_DUPLICADO = 'Já existe uma ação com este ticker';

export class AcoesService {
  constructor(private readonly repo: AcoesRepository) {}

  listar(ticker?: string): Acao[] {
    return this.repo.listar(ticker || undefined);
  }

  obter(id: number): Acao {
    const acao = this.repo.buscar(id);
    if (!acao) throw naoEncontrado('Ação');
    return acao;
  }

  criar(dados: AcaoInput): Acao {
    return comUnicidade(() => this.repo.inserir(dados), TICKER_DUPLICADO);
  }

  atualizar(id: number, dados: AtualizaAcaoInput): Acao {
    this.obter(id);
    comUnicidade(() => this.repo.atualizar(id, dados), TICKER_DUPLICADO);
    return this.obter(id);
  }

  excluir(id: number): void {
    this.obter(id);
    if (this.repo.contarCompras(id) > 0) {
      throw new DomainError(409, 'ACAO_COM_COMPRAS', 'Ação já foi comprada e não pode ser excluída');
    }
    this.repo.excluir(id);
  }
}
