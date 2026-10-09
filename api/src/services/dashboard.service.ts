import type { Cotacao, Dashboard, FatiaAlocacao } from '@safra/shared';
import { arredondar } from '../dinheiro';
import { naoEncontrado } from '../errors';
import type { MercadoSimulado } from '../mercado/mercado-simulado';
import type { CarteirasRepository } from '../repositories/carteiras.repository';
import type { ComprasRepository } from '../repositories/compras.repository';
import type { VendasRepository } from '../repositories/vendas.repository';

function fatias(valores: Map<string, number>): FatiaAlocacao[] {
  const total = [...valores.values()].reduce((s, v) => s + v, 0);
  if (total <= 0) return [];
  return [...valores.entries()]
    .map(([nome, valor]) => ({ nome, valor: arredondar(valor), percentual: arredondar((valor / total) * 100) }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome));
}

export class DashboardService {
  constructor(
    private readonly carteiras: CarteirasRepository,
    private readonly compras: ComprasRepository,
    private readonly vendas: VendasRepository,
    private readonly mercado: MercadoSimulado,
  ) {}

  obter(carteiraId?: number): Dashboard {
    if (carteiraId !== undefined && !this.carteiras.buscar(carteiraId)) throw naoEncontrado('Carteira');

    const caixa = arredondar(this.carteiras.somarSaldos(carteiraId));
    const posicoes = this.compras.posicoes(carteiraId);
    const cotacoes = this.mercado.cotacoes();
    const porAcao = new Map<number, Cotacao>(cotacoes.map((c) => [c.acaoId, c]));
    const tempos = this.mercado.linhaDoTempo();

    let valorMercado = 0;
    let investido = 0;
    let variacaoDia = 0;
    let valorAbertura = 0;
    const porSetor = new Map<string, number>();
    const porAtivo = new Map<string, number>();
    for (const p of posicoes) {
      const c = porAcao.get(p.acaoId);
      const preco = c?.preco ?? p.precoAtual;
      const abertura = c?.abertura ?? preco;
      const valor = p.quantidade * preco;
      const setor = p.setor ?? 'Outros';
      valorMercado += valor;
      investido += p.valorInvestido;
      variacaoDia += p.quantidade * (preco - abertura);
      valorAbertura += p.quantidade * abertura;
      porSetor.set(setor, (porSetor.get(setor) ?? 0) + valor);
      porAtivo.set(p.ticker, valor);
    }

    const serie = tempos.map((t, i) => ({
      t,
      valor: arredondar(caixa + posicoes.reduce((s, p) => s + p.quantidade * (porAcao.get(p.acaoId)?.historico[i] ?? p.precoAtual), 0)),
    }));
    const ordenadas = [...cotacoes].sort((a, b) => b.variacao - a.variacao);

    return {
      patrimonio: arredondar(caixa + valorMercado),
      caixa,
      valorMercado: arredondar(valorMercado),
      investido: arredondar(investido),
      resultadoNaoRealizado: arredondar(valorMercado - investido),
      resultadoRealizado: arredondar(this.vendas.somarResultado(carteiraId)),
      variacaoDia: arredondar(variacaoDia),
      variacaoDiaPercentual: valorAbertura > 0 ? arredondar((variacaoDia / valorAbertura) * 100) : 0,
      alocacaoPorSetor: fatias(porSetor),
      alocacaoPorAtivo: fatias(porAtivo),
      serie,
      maioresAltas: ordenadas.slice(0, 3),
      maioresBaixas: ordenadas.slice(-3).reverse(),
      posicoes,
    };
  }
}
