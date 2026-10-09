import type { Cotacao } from '@safra/shared';
import type { DB } from '../db/connection';
import { arredondar } from '../dinheiro';

export interface OpcoesMercado {
  aleatorio?: () => number;
  agora?: () => Date;
  /** Desvio-padrão do log-retorno por tick. */
  volatilidade?: number;
  ticksPorPonto?: number;
  maxPontos?: number;
}

interface AcaoLinha {
  id: number;
  ticker: string;
  nome: string;
  setor: string | null;
  preco: number;
}

interface Estado {
  abertura: number;
  historico: number[];
}

type Assinante = (cotacoes: Cotacao[]) => void;

/**
 * Mercado simulado: random walk log-normal (preço × e^(σ·Z)), o modelo clássico de preço de ação.
 * O banco continua sendo a fonte da verdade do preço de execução; o estado em memória guarda
 * abertura e histórico intraday do "pregão" (que reinicia junto com a API).
 */
export class MercadoSimulado {
  private readonly estados = new Map<number, Estado>();
  private readonly assinantes = new Set<Assinante>();
  private tempos: string[] = [];
  private ticks = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private readonly aleatorio: () => number;
  private readonly agora: () => Date;
  private readonly volatilidade: number;
  private readonly ticksPorPonto: number;
  private readonly maxPontos: number;

  constructor(
    private readonly db: DB,
    opcoes: OpcoesMercado = {},
  ) {
    this.aleatorio = opcoes.aleatorio ?? Math.random;
    this.agora = opcoes.agora ?? (() => new Date());
    this.volatilidade = opcoes.volatilidade ?? 0.0015;
    this.ticksPorPonto = opcoes.ticksPorPonto ?? 5;
    this.maxPontos = opcoes.maxPontos ?? 120;
  }

  cotacoes(): Cotacao[] {
    return this.sincronizar(this.lerAcoes()).map(([acao, estado]) => this.paraCotacao(acao, estado));
  }

  cotacao(acaoId: number): Cotacao | undefined {
    return this.cotacoes().find((c) => c.acaoId === acaoId);
  }

  linhaDoTempo(): string[] {
    return [...this.tempos];
  }

  tick(): Cotacao[] {
    const atuais = this.sincronizar(this.lerAcoes());
    const atualizar = this.db.prepare('UPDATE acoes SET preco = ? WHERE id = ?');
    const novos = atuais.map(([acao, estado]) => {
      const preco = Math.max(0.01, arredondar(acao.preco * Math.exp(this.volatilidade * this.normal())));
      return [{ ...acao, preco }, estado] as const;
    });
    this.db.transaction(() => novos.forEach(([acao]) => atualizar.run(acao.preco, acao.id)))();

    this.ticks++;
    if (this.ticks % this.ticksPorPonto === 0) this.registrarPonto(novos.map(([acao, estado]) => [acao.preco, estado] as const));

    const cotacoes = novos.map(([acao, estado]) => this.paraCotacao(acao, estado));
    for (const assinante of this.assinantes) {
      try {
        assinante(cotacoes);
      } catch (erro) {
        // um cliente com problema não pode derrubar o pregão dos demais
        console.error('[mercado] assinante falhou', erro);
      }
    }
    return cotacoes;
  }

  assinar(assinante: Assinante): () => void {
    this.assinantes.add(assinante);
    return () => this.assinantes.delete(assinante);
  }

  iniciar(intervaloMs = 1000): void {
    this.timer ??= setInterval(() => {
      try {
        this.tick();
      } catch (erro) {
        console.error('[mercado] tick falhou', erro); // nunca derrubar o processo por um tick
      }
    }, intervaloMs);
  }

  parar(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private lerAcoes(): AcaoLinha[] {
    return this.db.prepare('SELECT id, ticker, nome, setor, preco FROM acoes ORDER BY ticker').all() as AcaoLinha[];
  }

  /** Cria estado para ações novas (alinhado à linha do tempo) e descarta o das excluídas. */
  private sincronizar(acoes: AcaoLinha[]): (readonly [AcaoLinha, Estado])[] {
    if (this.tempos.length === 0 && acoes.length > 0) this.tempos.push(this.agora().toISOString());
    const ids = new Set(acoes.map((a) => a.id));
    for (const id of this.estados.keys()) if (!ids.has(id)) this.estados.delete(id);
    return acoes.map((acao) => {
      let estado = this.estados.get(acao.id);
      if (!estado) {
        estado = { abertura: acao.preco, historico: Array(this.tempos.length).fill(acao.preco) };
        this.estados.set(acao.id, estado);
      }
      return [acao, estado] as const;
    });
  }

  private registrarPonto(precos: (readonly [number, Estado])[]): void {
    this.tempos.push(this.agora().toISOString());
    for (const [preco, estado] of precos) estado.historico.push(preco);
    if (this.tempos.length > this.maxPontos) {
      this.tempos.shift();
      for (const estado of this.estados.values()) estado.historico.shift();
    }
  }

  private paraCotacao(acao: AcaoLinha, estado: Estado): Cotacao {
    return {
      acaoId: acao.id,
      ticker: acao.ticker,
      nome: acao.nome,
      setor: acao.setor,
      preco: acao.preco,
      abertura: estado.abertura,
      variacao: arredondar(((acao.preco - estado.abertura) / estado.abertura) * 100),
      historico: [...estado.historico],
      atualizadoEm: this.agora().toISOString(),
    };
  }

  /** Normal padrão via Box–Muller. */
  private normal(): number {
    const u1 = 1 - this.aleatorio();
    const u2 = this.aleatorio();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
