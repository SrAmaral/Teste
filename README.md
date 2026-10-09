# Safra Invest Lab

Teste técnico: **micro front-ends Angular** (Native Federation) com shell, MFE de Carteiras, MFE de Ações e API Express + SQLite. A Home da aplicação é a própria documentação do projeto.

## Rodar

```bash
nvm use          # Node 24 (.nvmrc)
npm install
npm run dev      # http://localhost:4200
```

| Peça | URL |
|---|---|
| Shell | http://localhost:4200 |
| mfe-carteiras (standalone) | http://localhost:4201/carteiras |
| mfe-acoes (standalone) | http://localhost:4202/acoes |
| API | http://localhost:3000/api/health |

## Testes

```bash
npm test
```

## Documentação

Leia na Home da aplicação ou direto em [`docs/`](docs/01-visao-geral.md):
[arquitetura](docs/02-arquitetura.md) · [estrutura](docs/03-estrutura.md) · [dados e API](docs/04-dados-e-api.md) · [decisões](docs/05-decisoes.md) · [como rodar](docs/06-como-rodar.md) · [uso de IA](docs/07-uso-de-ia.md)
