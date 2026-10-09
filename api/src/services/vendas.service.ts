import type { VendaResultado } from '@safra/shared';
import type { DB } from '../db/connection';
import { arredondar } from '../dinheiro';
import { DomainError, naoEncontrado } from '../errors';
import type { Travas } from '../mercado/travas';
import type { AcoesRepository } from '../repositories/acoes.repository';
import type { CarteirasRepository } from '../repositories/carteiras.repository';
import type { ComprasRepository } from '../repositories/compras.repository';
import type { VendasRepository } from '../repositories/vendas.repository';
import type { NovaVendaInput } from '../schemas/vendas';

export class VendasService {
  constructor(
    private readonly db: DB,
    private readonly carteiras: CarteirasRepository,
    private readonly acoes: AcoesRepository,
    private readonly compras: ComprasRepository,
    private readonly vendas: VendasRepository,
    private readonly travas: Travas,
  ) {}

  vender(dados: NovaVendaInput): VendaResultado {
    return this.db.transaction(() => {
      const carteira = this.carteiras.buscar(dados.carteiraId);
      if (!carteira) throw naoEncontrado('Carteira');
      const acao = this.acoes.buscar(dados.acaoId);
      if (!acao) throw naoEncontrado('Ação');

      const posicao = this.compras.posicao(carteira.id, acao.id);
      if (dados.quantidade > posicao.quantidade) {
        throw new DomainError(422, 'POSICAO_INSUFICIENTE', 'Quantidade maior que a posição na carteira', {
          disponivel: posicao.quantidade,
        });
      }

      const preco = dados.travaToken ? this.travas.consumir(dados.travaToken, acao.id) : acao.preco;
      const total = arredondar(preco * dados.quantidade);
      // Custo médio; vendendo tudo, baixa o custo restante inteiro (sem centavos residuais).
      const custo =
        dados.quantidade === posicao.quantidade ? posicao.custo : arredondar((posicao.custo / posicao.quantidade) * dados.quantidade);
      const resultado = arredondar(total - custo);
      const saldoRestante = arredondar(carteira.saldo + total);

      this.carteiras.atualizarSaldo(carteira.id, saldoRestante);
      const venda = this.vendas.inserir({ carteiraId: carteira.id, acaoId: acao.id, quantidade: dados.quantidade, precoUnitario: preco, total, custo, resultado });
      return { venda, saldoRestante };
    })();
  }
}
