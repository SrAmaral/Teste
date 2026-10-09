# Estrutura de pastas

```
teste_safra/                    npm workspaces
├── apps/
│   ├── shell/                  host (:4200)
│   │   ├── federation.config.mjs
│   │   ├── public/federation.manifest.json   URLs dos remotes (runtime)
│   │   └── src/app/
│   │       ├── federation/     carregamento dos remotes + fallback
│   │       ├── layout/         status da API
│   │       ├── notificacoes/   escuta de eventos dos MFEs
│   │       └── docs/           Home = documentação (markdown + mermaid)
│   ├── mfe-carteiras/          remote (:4201) — expõe ./routes = CARTEIRAS_ROUTES
│   │   └── src/app/{data, lista, form, detalhe, shared}
│   └── mfe-acoes/              remote (:4202) — expõe ./routes = ACOES_ROUTES
│       └── src/app/{data, catalogo, comprar, shared}
├── api/                        Express + better-sqlite3 (:3000)
│   ├── src/{routes, services, repositories, schemas, db, middleware}
│   └── test/                   vitest + supertest (SQLite em memória)
├── libs/shared/                tipos de domínio + constantes (sem runtime)
├── docs/                       esta documentação (copiada para o shell por scripts/sync-docs.mjs)
│   └── superpowers/            spec e plano gerados no processo com IA
└── scripts/sync-docs.mjs
```

## Camadas da API

`routes` (HTTP + validação zod) → `services` (regras de negócio, lançam `DomainError`) → `repositories` (SQL com prepared statements).

## Organização dos MFEs

- `data/` — cliente HTTP do MFE e interceptor de erro.
- Uma pasta por tela (`lista`, `form`, `detalhe`, `catalogo`, `comprar`).
- `shared/` — dialog de confirmação local ao MFE.
