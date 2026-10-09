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

## SSE em vez de WebSocket ou polling
- **Contexto:** as cotações só fluem do servidor para o navegador.
- **Decisão:** Server-Sent Events (`EventSource`) em `/api/cotacoes/stream`.
- **Consequência:** nativo no navegador, reconexão automática, sem biblioteca; passa pelo proxy do `ng serve` e pelo container único.

## Mercado simulado (random walk log-normal)
- **Decisão:** a cada segundo, `preço × e^(σ·Z)` com `Z ~ N(0,1)` (Box–Muller), arredondado a centavos; gerador aleatório e relógio injetáveis.
- **Consequência:** comportamento realista e **testes determinísticos** (mesma semente → mesma série). O histórico intraday fica em memória: o "pregão" reinicia junto com a API.

## Trava de cotação (RFQ) de 8 s
- **Contexto:** com preço mudando a cada segundo, o usuário poderia pagar diferente do que viu.
- **Decisão:** `POST /cotacoes/:id/trava` devolve um token de uso único válido por 8 s; a ordem com token executa no preço travado, senão `409 COTACAO_EXPIRADA` e a boleta renova a trava.
- **Consequência:** o padrão de mesa de operações (*request for quote*), com contagem regressiva visível na boleta.

## Migrações versionadas
- **Decisão:** lista ordenada de migrações aplicadas em transação conforme `PRAGMA user_version`.
- **Consequência:** bancos da fase 1 evoluem sem perda de dados; a migração v1 usa `IF NOT EXISTS` para adotar bancos criados antes do versionamento.

## Custo médio
- **Decisão:** o método de custo médio (padrão no Brasil) para posições e resultado realizado; venda total baixa o custo restante inteiro.
- **Consequência:** preço médio não muda em vendas parciais e não sobram "posições fantasma" de centavos.

## Extrato lido direto do repositório
- **Decisão:** `UNION ALL` de depósitos, compras e vendas, com filtros parametrizados, ordenação em lista branca e `LIMIT/OFFSET`; sem camada de service por ser só leitura.
- **Consequência:** paginação e filtros no servidor; parâmetros inválidos viram `400`, nunca SQL dinâmico.

## Design tokens próprios + Material como motor
- **Decisão:** `libs/ui-tokens/_tokens.scss` define o tema escuro (superfícies, texto, alta/baixa, dourado, tipografia Inter + JetBrains Mono tabular) e sobrescreve os tokens `--mat-sys-*`; dialog, select, menu e snackbar continuam do Material pela acessibilidade.
- **Consequência:** visual de produto financeiro sem reescrever componentes acessíveis; tokens compartilhados por serem só estilo (sem runtime).

## Gráficos em SVG próprio
- **Decisão:** sparkline, área com crosshair e donut desenhados em SVG, com a geometria em funções puras testadas.
- **Consequência:** zero dependência, 100% no tema, bundle pequeno.

## Duplicação consciente entre MFEs
- **Decisão:** `CotacoesStore`, `FlashDirective` e os componentes de gráfico existem em cada app que os usa.
- **Consequência:** cada MFE continua implantável sozinho; numa empresa, iriam para uma biblioteca de design system versionada.

