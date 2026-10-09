# Safra Invest Lab

Aplicação de teste técnico que simula um pequeno domínio de investimentos em **arquitetura de micro front-ends Angular**.

## O que dá para fazer

- **Dashboard** — patrimônio, caixa, resultado realizado e não realizado, evolução no pregão e alocação por setor, tudo recalculado ao vivo.
- **Mercado ao vivo** — cotações simuladas transmitidas por SSE, com variação do dia, mini gráfico e boleta de compra/venda com **trava de preço de 8 s**.
- **Carteiras** — cadastro, depósitos e detalhe com posições reprecificadas a cada tick (custo médio).
- **Extrato** — depósitos, compras e vendas com filtros, ordenação e paginação no servidor.
- **Documentação** — estas páginas, no menu Documentação (a tela inicial é o Dashboard).
- **Catálogo** — cadastro das ações negociáveis (ticker, nome, setor, preço).

## Peças

| Peça | Porta | Papel |
|---|---|---|
| `apps/shell` | 4200 | Host: layout, menu, rotas, documentação |
| `apps/mfe-carteiras` | 4201 | Micro front-end de carteiras |
| `apps/mfe-acoes` | 4202 | Micro front-end de ações e compras |
| `api` | 3000 | API REST Express + SQLite |

## Destaques

- MFEs carregados **em runtime** via Native Federation — o shell não conhece o código deles em build.
- Cada MFE **roda sozinho** na própria porta.
- Se um MFE cair, o shell mostra "Módulo indisponível" e o resto continua funcionando.
- MFEs se comunicam por **evento de navegador** (`safra:ordem-executada`) e por **deep link** (`/acoes?ticker=…&lado=VENDER`), sem dependência direta.
- Regras de negócio (saldo, posição, custo médio, validação) ficam na API, com transação SQLite em cada ordem.
- **Tempo real via SSE + signals**: um mercado simulado (random walk log-normal) atualiza preços a cada segundo.
- **Trava de cotação (RFQ)**: o preço visto vale por 8 s, com token de uso único.
- **Migrações versionadas** do SQLite (`PRAGMA user_version`).
- **Design system próprio** (tokens escuros) sobre o Angular Material e gráficos em SVG próprio.

Continue em [Arquitetura](02-arquitetura.md).
