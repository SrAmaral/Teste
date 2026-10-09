# Safra Invest Lab

Aplicação de teste técnico que simula um pequeno domínio de investimentos em **arquitetura de micro front-ends Angular**.

## O que dá para fazer

- **Carteiras** — cadastrar, editar, excluir, depositar saldo e acompanhar posições e histórico de compras.
- **Ações** — manter o catálogo de ações (ticker, nome, setor, preço) e **comprar** ações para uma carteira.
- **Home** — esta documentação, renderizada a partir dos arquivos `docs/*.md` do repositório.

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
- MFEs se comunicam por **evento de navegador** (`safra:compra-realizada`), sem dependência direta.
- Regras de negócio (saldo, integridade, validação) ficam na API, com transação SQLite na compra.

Continue em [Arquitetura](02-arquitetura.md).
