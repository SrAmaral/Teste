# Decisões técnicas

Formato curto de ADR: contexto → decisão → consequência.

## Native Federation (e não Module Federation/webpack)
- **Contexto:** Angular moderno usa o builder esbuild; Module Federation exige voltar ao webpack.
- **Decisão:** `@angular-architects/native-federation`, com remotes descobertos via `federation.manifest.json`.
- **Consequência:** build rápido, padrão de import maps do navegador; troca de URL de remote sem rebuild.

## Carregamento de remote por rota, com fallback
- **Decisão:** o shell não pré-carrega remotes; `rotasRemotas()` carrega sob demanda e devolve uma rota "Módulo indisponível" em caso de erro.
- **Consequência:** a queda de um MFE não derruba o shell nem o outro MFE.

## Node 24 LTS + Angular 22
- **Contexto:** a máquina tinha Node 20, em fim de vida desde abril/2026, e várias libs atuais já exigem Node ≥ 22.
- **Decisão:** Node 24 LTS (`.nvmrc`) e Angular 22.2.
- **Consequência:** stack atual sem fixar versões antigas.

## Monorepo com npm workspaces, apps independentes
- **Decisão:** cada MFE é um workspace Angular próprio (`angular.json`, porta, build), com dependências hoisted na raiz.
- **Consequência:** isolamento real entre MFEs e versões idênticas de Angular (exigência do `shared` singleton). O avaliador clona um repositório só.

## `@safra/shared` só com tipos e constantes
- **Decisão:** resolvido por `paths` do tsconfig e **empacotado** em cada app (`skip` na federação), sem estado.
- **Consequência:** contrato tipado entre MFEs e API sem acoplar runtime.

## Ajustes no `federation.config.mjs`
- **Contexto:** a análise de dependências usadas do Native Federation 22 (`ignoreUnusedDeps`) não aceita imports fora da pasta do app — e `@safra/shared` fica em `libs/`.
- **Decisão:** `ignoreUnusedDeps: false` (compartilha todas as dependências do `package.json`), com `skip` para entry points de build/teste (`schematics`, `testing`) e para `@angular/platform-browser/animations`, que não são usados no navegador. O locale `@angular/common/locales/pt` é re-adicionado explicitamente ao `shared`, porque o esbuild o trata como external (subpath de `@angular/common`) e ele precisa estar no import map.
- **Consequência:** builds de federação um pouco mais pesados; configuração comentada em cada app.

## Interceptor e dialog duplicados nos MFEs
- **Decisão:** cada MFE tem sua cópia de `api-error.interceptor.ts` e `confirm-dialog.ts`.
- **Consequência:** ~60 linhas duplicadas em troca de deploy independente; numa empresa, isso iria para uma lib de design system versionada.

## Express 5 + better-sqlite3 + zod
- **Decisão:** API REST pequena em camadas (routes → services → repositories), SQLite síncrono, validação com zod.
- **Consequência:** sem ORM; SQL explícito e transações simples (`db.transaction`).

## Posição calculada, não armazenada
- **Decisão:** posição = agregação de `compras`.
- **Consequência:** nada de dado duplicado para sincronizar; preço médio sempre consistente.

## Dinheiro em `REAL` com arredondamento a 2 casas
- **Decisão:** simplificação aceitável para o teste. A API só aceita valores com até 2 casas decimais (preço ≥ R$ 0,01, teto de R$ 1 trilhão) e todo cálculo passa por `arredondar()`.
- **Consequência:** casos como 3 × 33,33 são testados. Em produção, usar centavos inteiros ou decimal.

## Angular Material com tema próprio
- **Decisão:** Material 3 com azul-marinho + dourado via tokens `--mat-sys-*`, inspirado no setor bancário, sem logo ou marca oficial.
