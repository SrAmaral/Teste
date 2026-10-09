# Arquitetura

## Visão de runtime

```mermaid
flowchart LR
  B[Navegador] --> S[Shell :4200]
  S -- federation.manifest.json --> M1[mfe-carteiras :4201]
  S -- federation.manifest.json --> M2[mfe-acoes :4202]
  M1 -- HTTP --> A[API :3000]
  M2 -- HTTP --> A
  S -- /api/health --> A
  A --> D[(SQLite)]
```

## Como o shell carrega um MFE

```mermaid
sequenceDiagram
  participant U as Usuário
  participant S as Shell
  participant M as federation.manifest.json
  participant R as mfe-acoes (remoteEntry.json)
  U->>S: navega para /acoes
  S->>M: lê URL do remote
  S->>R: loadRemoteModule('./routes')
  R-->>S: ACOES_ROUTES
  S->>S: registra rotas filhas e renderiza
  Note over S,R: se falhar → rota de fallback "Módulo indisponível"
```

1. `main.ts` do shell chama `initFederation()` **sem** pré-carregar remotes.
2. Cada rota usa `rotasRemotas(nome, export)`, que lê o manifest, chama `loadRemoteModule` e devolve as rotas exportadas. Qualquer erro vira a rota `RemoteIndisponivel`.
3. Trocar a URL de um remote é só editar `federation.manifest.json` — sem rebuild do shell.

## Compartilhamento de dependências

`@angular/*`, `@angular/material`, `@angular/cdk` e `rxjs` são `shared` **singleton**: o navegador baixa uma única cópia, usada pelo shell e pelos dois MFEs. Isso exige versões idênticas — garantidas pelo npm workspaces (dependências hoisted na raiz).

## Injeção de dependência entre host e remote

Quando um MFE está hospedado, o *root injector* é o do **shell**. Por isso os MFEs:

- declaram seus services como `@Injectable()` **sem** `providedIn: 'root'`;
- registram `HttpClient` + interceptor, `LOCALE_ID` e os services nos `providers` da rota exposta.

Assim o comportamento é o mesmo hospedado ou em modo standalone.

## Comunicação entre MFEs

| Necessidade | Mecanismo |
|---|---|
| Dados (carteiras para o formulário de compra) | API — fonte única da verdade |
| Avisar que houve compra | `window.dispatchEvent(new CustomEvent('safra:compra-realizada'))` — o shell escuta e mostra uma notificação |
| Ir da compra para a carteira | Navegação absoluta `/carteiras/:id` pelo router do shell |

Nenhum MFE importa código de outro. O contrato é só o nome do evento e o tipo `CompraResultado` em `@safra/shared`.
