import type { Carteira, CarteiraResumo } from '@safra/shared';
import { arredondar } from '../dinheiro';
import { comUnicidade, DomainError, naoEncontrado } from '../errors';
import type { CarteirasRepository } from '../repositories/carteiras.repository';
import type { AtualizaCarteiraInput, NovaCarteiraInput } from '../schemas/carteiras';

const NOME_DUPLICADO = 'Já existe uma carteira com este nome';

export class CarteirasService {
  constructor(private readonly repo: CarteirasRepository) {}

  listar(): CarteiraResumo[] {
    return this.repo.listarResumo();
  }

  obter(id: number): Carteira {
    const carteira = this.repo.buscar(id);
    if (!carteira) throw naoEncontrado('Carteira');
    return carteira;
  }

  criar(dados: NovaCarteiraInput): Carteira {
    return comUnicidade(
      () => this.repo.inserir({ nome: dados.nome, descricao: dados.descricao ?? null, saldo: arredondar(dados.saldoInicial) }),
      NOME_DUPLICADO,
    );
  }

  atualizar(id: number, dados: AtualizaCarteiraInput): Carteira {
    this.obter(id);
    comUnicidade(() => this.repo.atualizar(id, { nome: dados.nome, descricao: dados.descricao ?? null }), NOME_DUPLICADO);
    return this.obter(id);
  }

  excluir(id: number): void {
    this.obter(id);
    if (this.repo.contarCompras(id) > 0) {
      throw new DomainError(409, 'CARTEIRA_COM_COMPRAS', 'Carteira possui compras e não pode ser excluída');
    }
    this.repo.excluir(id);
  }

  depositar(id: number, valor: number): Carteira {
    const carteira = this.obter(id);
    this.repo.atualizarSaldo(id, arredondar(carteira.saldo + valor));
    return this.obter(id);
  }
}
