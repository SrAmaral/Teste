import type { Compra, CompraResultado, Posicao } from '@safra/shared';
import type { DB } from '../db/connection';
import { arredondar } from '../dinheiro';
import { DomainError, naoEncontrado } from '../errors';
import type { AcoesRepository } from '../repositories/acoes.repository';
import type { CarteirasRepository } from '../repositories/carteiras.repository';
import type { ComprasRepository } from '../repositories/compras.repository';
import type { Travas } from '../mercado/travas';
import type { NovaCompraInput } from '../schemas/compras';

export class ComprasService {
  constructor(
    private readonly db: DB,
    private readonly carteiras: CarteirasRepository,
    private readonly acoes: AcoesRepository,
    private readonly compras: ComprasRepository,
    private readonly travas: Travas,
  ) {}

  comprar(dados: NovaCompraInput): CompraResultado {
    return this.db.transaction(() => {
      const carteira = this.carteiras.buscar(dados.carteiraId);
      if (!carteira) throw naoEncontrado('Carteira');
      const acao = this.acoes.buscar(dados.acaoId);
      if (!acao) throw naoEncontrado('Ação');

      const preco = dados.travaToken ? this.travas.precoValido(dados.travaToken, acao.id) : acao.preco;
      const total = arredondar(preco * dados.quantidade);
      if (total > carteira.saldo) {
        throw new DomainError(422, 'SALDO_INSUFICIENTE', 'Saldo insuficiente para esta compra', {
          necessario: total,
          disponivel: carteira.saldo,
        });
      }

      // só gasta a trava depois de validar o saldo: uma recusa não obriga a pedir nova cotação
      if (dados.travaToken) this.travas.consumir(dados.travaToken, acao.id);
      const saldoRestante = arredondar(carteira.saldo - total);
      this.carteiras.atualizarSaldo(carteira.id, saldoRestante);
      const compra = this.compras.inserir({
        carteiraId: carteira.id,
        acaoId: acao.id,
        quantidade: dados.quantidade,
        precoUnitario: preco,
        total,
      });
      return { compra, saldoRestante };
    })();
  }

  listar(carteiraId?: number): Compra[] {
    return this.compras.listar(carteiraId);
  }

  posicoes(carteiraId: number): Posicao[] {
    if (!this.carteiras.buscar(carteiraId)) throw naoEncontrado('Carteira');
    return this.compras.posicoes(carteiraId);
  }
}
