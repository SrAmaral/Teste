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

## Tempo real

```mermaid
sequenceDiagram
  participant M as MercadoSimulado (API)
  participant S as /api/cotacoes/stream (SSE)
  participant St as CotacoesStore (cada app)
  participant UI as Componentes (signals)
  M->>M: tick() a cada 1 s (random walk log-normal)
  M->>S: assinantes recebem as cotações
  S-->>St: event: cotacoes
  St->>UI: signal<Map> atualizado → computed() recalcula P&L
```

## Ordem com trava de preço

```mermaid
sequenceDiagram
  participant B as Boleta (mfe-acoes)
  participant A as API
  B->>A: POST /cotacoes/:id/trava
  A-->>B: { token, preco, expiraEm (+8 s) }
  B->>A: POST /compras | /vendas { travaToken }
  alt token válido
    A-->>B: 201 executada no preço travado
    B-->>B: window.dispatchEvent('safra:ordem-executada')
  else expirado / usado / outra ação
    A-->>B: 409 COTACAO_EXPIRADA → boleta renova a trava
  end
```

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
| Avisar que houve compra ou venda | `window.dispatchEvent(new CustomEvent('safra:ordem-executada'))` — o shell escuta e mostra uma notificação (com o resultado, na venda) |
| Vender a partir da carteira | Deep link `/acoes?ticker=PETR4&lado=VENDER&carteira=1` — o mfe-acoes lê os query params e pré-preenche a boleta |
| Ir da compra para a carteira | Navegação absoluta `/carteiras/:id` pelo router do shell |

Nenhum MFE importa código de outro. O contrato é o nome do evento, o tipo `OrdemExecutada` em `@safra/shared` e o formato do deep link.
