# Como rodar

## Pré-requisitos

- Node **24 LTS** (ou ≥ 22.22.3). Com nvm: `nvm use` na raiz (lê `.nvmrc`).

## Tudo junto

```bash
git clone https://github.com/SrAmaral/Teste.git
cd Teste
npm install
npm run dev
```

Abra http://localhost:4200. O comando sobe API (3000), mfe-carteiras (4201), mfe-acoes (4202) e shell (4200). Na primeira execução a API cria `api/data/safra.db` com 8 ações e 2 carteiras de exemplo.

> O npm 11 pede aprovação de *install scripts*. As aprovações necessárias (esbuild, better-sqlite3 etc.) já estão em `allowScripts` no `package.json` da raiz.

## Cada peça sozinha

```bash
npm run dev -w api                 # API em http://localhost:3000/api
npm run start -w mfe-carteiras     # http://localhost:4201/carteiras (standalone)
npm run start -w mfe-acoes         # http://localhost:4202/acoes (standalone)
npm run start -w shell             # http://localhost:4200
```

## Testes e build

```bash
npm test          # API (vitest + supertest) + 3 apps Angular (vitest)
npm run build     # build de produção dos 3 front-ends
```

## Mercado ao vivo

As cotações começam a variar assim que a API sobe (um tick por segundo). O histórico dos gráficos é do pregão atual: reinicia quando a API reinicia.

## Testar a resiliência

Com tudo rodando, pare só o `mfe-acoes` e recarregue http://localhost:4200/acoes: aparece **Módulo indisponível**, e Home e Carteiras continuam funcionando.

## Resetar os dados

Pare a API e apague `api/data/`.

## Deploy (Docker / Coolify)

O `Dockerfile` da raiz gera um **container único**: a API Express responde em `/api` e serve os builds na mesma origem — shell em `/`, remotes em `/mfe-carteiras/` e `/mfe-acoes/` (o `federation.manifest.json` de produção aponta para essas subpastas). Por isso o front usa `API_BASE_URL = '/api'`; em dev, o `ng serve` de cada app faz proxy de `/api` para a API em `:3000` (`proxy.conf.json`).

```bash
docker build -t safra-invest-lab .
docker run -p 3000:3000 -v safra-data:/data safra-invest-lab   # http://localhost:3000
```

No Coolify: *Build Pack* **Dockerfile**, porta **3000**, e um *Persistent Storage* montado em `/data` (onde fica o `safra.db`; sem ele os dados voltam ao seed a cada deploy).
