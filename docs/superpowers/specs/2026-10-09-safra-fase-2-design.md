# Safra Invest Lab — Fase 2: Mercado ao vivo, venda, extrato, dashboard e redesign

- **Data:** 2026-10-09
- **Status:** Aprovado em brainstorming, aguardando revisão da spec
- **Base:** fase 1 (`docs/superpowers/specs/2026-10-09-safra-mfe-investimentos-design.md`), já na `main`
- **Branch:** `feat/fase-2-mercado-ao-vivo`

## 1. Objetivo

Elevar o sistema de "CRUD funcional" para um produto com profundidade técnica visível e visual de mercado financeiro:

1. **Cotações ao vivo** — mercado simulado na API transmitido via SSE; preços, P&L e gráficos atualizando em tempo real.
2. **Venda + extrato** — ciclo completo de negociação com custo médio, resultado realizado e extrato unificado paginado no servidor.
3. **Dashboard** — visão consolidada com KPIs, evolução intraday e alocação, dentro do `mfe-carteiras`.
4. **Redesign** — direção visual "híbrido terminal + fintech" (base escura, números mono, acento dourado), com design tokens próprios.

### Critérios de sucesso

1. Ticker tape do shell, tabela do Mercado, detalhe da carteira e dashboard atualizam sozinhos a cada ~1 s.
2. Compra e venda com trava de preço de 8 s (RFQ); ordem com trava expirada é recusada com `409 COTACAO_EXPIRADA`.
3. Venda calcula resultado realizado pelo custo médio; preço médio não muda após venda parcial.
4. Extrato filtra, ordena e pagina no servidor; filtros refletidos na URL.
5. Banco existente da fase 1 migra para o novo schema sem perda de dados.
6. Os 89 testes da fase 1 continuam verdes; compra sem `travaToken` continua funcionando.
7. Visual não reconhecível como "Angular Material padrão"; contraste AA; `prefers-reduced-motion` respeitado.

## 2. Decisões técnicas

| Tema | Decisão | Alternativa descartada |
|---|---|---|
| Tempo real | **SSE** (`EventSource`), nativo, reconexão automática | WebSocket (bidirecional desnecessário, lib extra); polling |
| Gráficos | **Componentes SVG próprios** + funções puras de geometria | ECharts/Chart.js (peso, destoam do tema) |
| Design system | **Tokens SCSS próprios** (`libs/ui-tokens`) + Material só como motor de comportamento (dialog, select, menu, snackbar, tabs) com tema M3 escuro sobrescrito | Remover Material (reescrever acessibilidade) |
| Dados | **Migrações versionadas** via `PRAGMA user_version`; novas tabelas `depositos` e `vendas`; extrato por `UNION ALL` | Tabela única `movimentacoes` (migrar `compras`) |
| Preço na ordem | **Trava RFQ** com token de 8 s, uso único | Executar sempre ao preço corrente |
| Custo | **Custo médio** (padrão BR) | FIFO |
| Dashboard | Rota do `mfe-carteiras` (decisão do usuário) | MFE próprio; shell |

## 3. Back-end

### 3.1 Migrações (`api/src/db/migracoes.ts`)

Lista ordenada de migrações; `aplicarMigracoes(db)` executa, em transação, cada migração com índice ≥ `PRAGMA user_version` e atualiza a versão.

- **v1** — schema da fase 1 (`CREATE TABLE IF NOT EXISTS` carteiras, acoes, compras + índices). Bancos existentes (versão 0, tabelas já criadas) são adotados sem alteração.
- **v2**:
  ```sql
  CREATE TABLE depositos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    carteira_id INTEGER NOT NULL REFERENCES carteiras(id),
    valor REAL NOT NULL CHECK (valor > 0),
    data TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    carteira_id INTEGER NOT NULL REFERENCES carteiras(id),
    acao_id INTEGER NOT NULL REFERENCES acoes(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario REAL NOT NULL,
    total REAL NOT NULL,
    custo REAL NOT NULL,
    resultado REAL NOT NULL,
    data TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_depositos_carteira ON depositos(carteira_id);
  CREATE INDEX idx_vendas_carteira ON vendas(carteira_id);
  CREATE INDEX idx_vendas_acao ON vendas(acao_id);
  ```
- `POST /carteiras/:id/deposito` passa a registrar em `depositos`. Saldo inicial não gera depósito (aparece no extrato apenas o que foi movimentado após a criação).
- Excluir carteira/ação continua bloqueado se houver compras (toda venda pressupõe compra).

### 3.2 Simulador de mercado (`api/src/mercado/mercado-simulado.ts`)

- `class MercadoSimulado(db, { aleatorio?: () => number, agora?: () => Date, volatilidade?: number })`.
- `tick()`: para cada ação do banco, `novo = preco × exp(σ·Z)` com `Z ~ N(0,1)` (Box–Muller sobre `aleatorio`), `σ = 0.0015` por tick (padrão), arredondado a centavos, mínimo R$ 0,01. Atualiza `acoes.preco` em uma transação e notifica assinantes com as cotações alteradas.
- Estado em memória por ação: `abertura` (primeiro preço visto = abertura do "pregão") e `historico` (um ponto a cada 5 ticks, máximo 120 pontos).
- Ações criadas/excluídas entram/saem no próximo tick (lista relida do banco a cada tick).
- `cotacoes(): Cotacao[]`, `assinar(fn): () => void` (retorna cancelamento).
- `iniciar(intervaloMs = 1000)` / `parar()` — usados só pelo `server.ts`; testes chamam `tick()` manualmente.
- O pregão reinicia junto com a API (histórico não persistido) — documentado como limitação.

Tipo (em `@safra/shared`):
```ts
interface Cotacao { acaoId: number; ticker: string; nome: string; setor: string | null; preco: number; abertura: number; variacao: number; historico: number[]; atualizadoEm: string; }
```
`variacao` = `(preco − abertura) / abertura × 100`, arredondada a 2 casas.

### 3.3 Endpoints de cotação

- `GET /api/cotacoes` → `Cotacao[]` (com `historico`).
- `GET /api/cotacoes/stream` → `text/event-stream`:
  - ao conectar: `event: snapshot` com `Cotacao[]` completo;
  - a cada tick: `event: cotacoes` com `Cotacao[]` alteradas (sem `historico` exceto quando ganhou ponto novo — simplificação: sempre envia `historico` completo; volume pequeno);
  - `: heartbeat` a cada 15 s; cabeçalhos `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`;
  - remove o assinante quando a requisição fecha.
- `POST /api/cotacoes/:acaoId/trava` → `201 { token, acaoId, preco, expiraEm }` (token `crypto.randomUUID()`, TTL 8 s, uso único, guardado em `Map` em memória com limpeza dos expirados). `404` se a ação não existe.

### 3.4 Ordens

- `POST /api/compras` e `POST /api/vendas` aceitam `travaToken?: string`.
  - Com token: deve existir, pertencer à `acaoId`, não ter expirado e não ter sido usado → executa ao preço travado e consome o token. Caso contrário `409 COTACAO_EXPIRADA`.
  - Sem token: executa ao preço corrente (`acoes.preco`) — comportamento da fase 1.
- **Venda** (`POST /api/vendas { carteiraId, acaoId, quantidade, travaToken? }`), em transação:
  - posição atual (qtd, custo) calculada; `quantidade > qtd` → `422 POSICAO_INSUFICIENTE` com `details: { disponivel }`;
  - `precoMedio = custo / qtd`; `total = arredondar(preco × quantidade)`; `custoVenda = arredondar(precoMedio × quantidade)`; `resultado = arredondar(total − custoVenda)`;
  - credita `total` no saldo; insere em `vendas`;
  - resposta `201 { venda: Venda, saldoRestante }`.
- **Posições** (`GET /api/carteiras/:id/posicoes`): `quantidade = Σcompras.qtd − Σvendas.qtd`; `custo = Σcompras.total − Σvendas.custo`; `precoMedio = custo / quantidade`; omite quantidade 0. Campos novos: `setor`, `resultado` (valorAtual − valorInvestido), `resultadoPercentual`. `valorInvestido` passa a ser o custo restante.
- `CarteiraResumo.valorInvestido` usa o mesmo custo restante; `qtdAtivos` conta posições com quantidade > 0.

### 3.5 Extrato (`GET /api/extrato`)

Query (zod): `carteiraId?`, `tipo? = DEPOSITO | COMPRA | VENDA`, `de?`, `ate?` (datas `YYYY-MM-DD`, inclusivas), `ticker?` (trecho), `ordem = data | valor` (padrão `data`), `direcao = asc | desc` (padrão `desc`), `pagina ≥ 1` (padrão 1), `tamanho 1..100` (padrão 20).

```ts
interface Movimentacao { id: string; tipo: 'DEPOSITO' | 'COMPRA' | 'VENDA'; carteiraId: number; carteiraNome: string; ticker: string | null; quantidade: number | null; precoUnitario: number | null; valor: number; resultado: number | null; data: string; }
interface Pagina<T> { itens: T[]; total: number; pagina: number; tamanho: number; }
```
- `id` prefixado (`D-1`, `C-7`, `V-3`); `valor` com sinal (+ depósito/venda, − compra).
- Implementação: `UNION ALL` das três tabelas numa CTE, `WHERE` com parâmetros, `ORDER BY` por coluna em lista branca, `LIMIT/OFFSET`, e `COUNT(*)` da mesma CTE.
- Parâmetros inválidos → `400 VALIDACAO`.

### 3.6 Dashboard (`GET /api/dashboard?carteiraId=`)

Sem `carteiraId` = consolidado de todas as carteiras.
```ts
interface Dashboard {
  patrimonio: number; caixa: number; valorMercado: number; investido: number;
  resultadoNaoRealizado: number; resultadoRealizado: number; variacaoDia: number; variacaoDiaPercentual: number;
  alocacaoPorSetor: { nome: string; valor: number; percentual: number }[];
  alocacaoPorAtivo: { nome: string; valor: number; percentual: number }[];
  serie: { t: string; valor: number }[];
  maioresAltas: Cotacao[]; maioresBaixas: Cotacao[];
}
```
- `patrimonio = caixa + valorMercado`; `variacaoDia = Σ qtd × (preco − abertura)`; `serie` = para cada ponto do histórico intraday, `caixa + Σ qtd × preço naquele ponto` (posição atual — documentado); altas/baixas = top 3 por `variacao` entre todas as ações.
- Percentuais somam 100 (±0,01 por arredondamento); setor nulo vira "Outros".

### 3.7 Organização

```
api/src/
├── db/migracoes.ts
├── mercado/{mercado-simulado.ts, travas.ts}
├── repositories/{vendas,depositos,extrato,dashboard}.repository.ts
├── services/{vendas,extrato,dashboard,cotacoes}.service.ts
├── routes/{vendas,extrato,dashboard,cotacoes}.routes.ts
└── schemas/{vendas,extrato}.ts
```
`criarApp(db, { mercado? })` — mercado injetável; `server.ts` cria e inicia o simulador.

## 4. Front-end

### 4.1 Shell

- Layout: **ticker tape** fixo no topo (SSE próprio do shell, rolagem contínua CSS, pausa no hover, `● AO VIVO` / `● RECONECTANDO`), sidebar escura em dois grupos:
  - INVESTIMENTOS: Dashboard (`/carteiras`), Carteiras (`/carteiras/lista`), Mercado (`/acoes`), Extrato (`/carteiras/extrato`);
  - PROJETO: Documentação (`/docs`).
- Rota `''` → `/carteiras`.
- Indicador da API com latência medida no health (`API online · 12 ms`).
- Evento entre MFEs: `ORDEM_EXECUTADA_EVENT = 'safra:ordem-executada'` com `OrdemExecutada { tipo: 'COMPRA' | 'VENDA'; ticker; quantidade; total; saldoRestante; resultado?: number; carteiraId }`. Substitui `safra:compra-realizada`. Notificação do shell diferencia compra/venda e mostra resultado da venda.
- Docs com tema escuro.

### 4.2 mfe-carteiras

| Rota | Tela |
|---|---|
| `''` | **Dashboard**: seletor de carteira (Todas / X), 4 KPIs (Patrimônio + variação do dia, Caixa, Resultado não realizado, Resultado realizado), `AreaChart` da série, `Donut` por setor, listas de maiores altas/baixas; valores de mercado recalculados ao vivo |
| `lista` | Carteiras (tabela densa redesenhada) |
| `nova`, `:id/editar` | Formulário redesenhado |
| `:id` | Detalhe: KPIs da carteira, posições ao vivo (preço com flash, resultado R$/%), botão **Vender** → `/acoes?ticker=X&lado=VENDER&carteira=ID`; histórico usa o extrato filtrado pela carteira |
| `extrato` | Extrato: filtros (carteira, tipo, período, ticker) sincronizados com query params, ordenação clicável, paginação servidor, skeleton, valores com sinal e cor |

Rotas estáticas (`lista`, `nova`, `extrato`) declaradas antes de `:id`.

### 4.3 mfe-acoes

| Rota | Tela |
|---|---|
| `''` | **Mercado**: tabela de cotações ao vivo (ticker+nome, preço com flash, variação, `Sparkline`, botão Negociar), busca; **Boleta** lateral |
| `catalogo` | CRUD de ações redesenhado (botão "Gerenciar catálogo") |

**Boleta**:
- Lado Comprar/Vender (segmentado, cor por lado), carteira, quantidade inteira > 0, chips 25% / 50% / MÁX (compra: por saldo; venda: por posição), resumo (preço, total, saldo após, resultado estimado na venda).
- Trava: ao escolher ativo+carteira, chama `POST /trava`; mostra anel com contagem regressiva de 8 s; ao expirar, renova automaticamente na próxima interação; ao receber `409 COTACAO_EXPIRADA` na confirmação, renova e pede nova confirmação.
- Deep link: lê `ticker`, `lado`, `carteira` dos query params.
- Após executar: card de confirmação + dispara `safra:ordem-executada` + recarrega saldo/posição.

### 4.4 Tempo real no cliente

- `CotacoesStore` (`@Injectable()`, provido nas rotas de cada app): `EventSource` embrulhado em Observable; `status = signal<'conectando' | 'ao-vivo' | 'reconectando'>`, `cotacoes = signal<Map<number, Cotacao>>`, `cotacao(acaoId)`; fecha no `DestroyRef`. Fábrica de `EventSource` injetável (token) para testes.
- Diretiva `[appFlash]="valor"`: aplica `flash-alta`/`flash-baixa` por 600 ms quando o valor sobe/desce; nada com `prefers-reduced-motion`.
- Valores ao vivo via `computed()` combinando dados HTTP + `cotacoes()`.
- Cada app tem sua conexão (independência); no máximo 2 simultâneas (shell + MFE ativo).

## 5. Design system

- `libs/ui-tokens/_tokens.scss` (importado via `stylePreprocessorOptions.includePaths: ['../../libs/ui-tokens', '../../node_modules']`):
  - superfícies `--sf-bg #0b0e13`, `--sf-elev-1 #0e1219`, `--sf-card #121821`, `--sf-border #1e2530`, `--sf-border-strong #2a3340`;
  - texto `--tx-1 #ffffff`, `--tx-2 #d7dee8`, `--tx-3 #8b97a8` (≥ 4.5:1 sobre `--sf-card`);
  - semânticas `--alta #22c55e`, `--baixa #ef4444`, `--marca #c9a24b`, `--info #3b82f6`;
  - tipografia `--font-sans: Inter`, `--font-mono: 'JetBrains Mono'` com `font-variant-numeric: tabular-nums`;
  - espaçamento base 4 px, raios 6/10/14, sombras, durações 120/200 ms;
  - mixin `tema-material` que mapeia `--mat-sys-*` (tema M3 `color-scheme: dark`) para os tokens.
- Componentes próprios (standalone, `OnPush`, signals): `KpiCard`, `Sparkline`, `AreaChart` (gradiente + crosshair/tooltip), `Donut` (legenda + hover), `VariacaoBadge`, `Skeleton`, `EmptyState`, tabelas densas em HTML semântico (cabeçalho fixo, hover, numéricos à direita, ordenação clicável com `aria-sort`), `Boleta`.
- Geometria dos gráficos em funções puras testadas (`escalaLinear`, `caminhoLinha`, `caminhoArea`, `arcosDonut`).
- Acessibilidade: `:focus-visible` dourado, ▲/▼ + sinal junto da cor, `aria-live="polite"` em valores ao vivo agregados (não em cada célula), `prefers-reduced-motion`.
- Duplicação consciente: `Sparkline` e `[appFlash]` existem nos apps que os usam (independência de deploy); tokens compartilhados por serem só estilo. Registrado em ADR.

## 6. Testes

**API:** simulador determinístico (RNG/relógio injetados; mesma semente → mesma série; preço ≥ 0,01; histórico limitado a 120); SSE (supertest lendo `snapshot` e um `cotacoes` após `tick()`); trava (válida, expirada, reutilizada, outra ação, 404); venda (resultado, custo médio preservado após venda parcial, posição insuficiente, posição zerada some, saldo creditado); compra com trava; depósito registrado; extrato (cada filtro, ordenação, paginação, total, validação); dashboard (somas, percentuais, consolidado vs carteira); migração (banco fase-1 com dados → v2, dados intactos, idempotente).

**Front:** `CotacoesStore` com EventSource falso (snapshot, tick, status, reconexão); `[appFlash]`; funções de geometria; Boleta (contagem com timers falsos, MÁX compra/venda, 409 → renova trava, deep link); Extrato (filtros ↔ URL, paginação); Dashboard (`computed` ao vivo); notificador do shell (compra e venda).

**Navegador:** smoke após cada bloco (ticker vivo, compra com trava, venda via deep link, extrato filtrado, dashboard reagindo), com screenshot. Só sobe stack própria nas portas padrão se nenhuma stack do usuário estiver rodando; encerra apenas pelos PIDs que iniciou.

## 7. Documentação

- ADRs novos em `05-decisoes.md`: SSE, trava RFQ, migrações versionadas, custo médio, design tokens + Material como motor, duplicação consciente.
- `02-arquitetura.md`: diagrama com o stream de cotações e o evento `safra:ordem-executada`.
- `04-dados-e-api.md`: novas tabelas e endpoints.
- `07-uso-de-ia.md`: seção "Fase 2" (pedido, decisões no brainstorming com visual companion, execução).

## 8. Fora de escopo

Autenticação, ordens limite/stop, persistência do histórico de preços entre reinícios, testes e2e e CI.
