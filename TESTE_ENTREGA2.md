# Teste da Entrega 2 (pedidos, painel da loja, privacidade)

Rodada final: 11/11/2026, branch `entrega-2-pedidos` nos dois repositórios, banco de e2e
recriado do zero (`cremoso_e2e`, seed de dev do backend).

## Resultado

| O quê | Como | Resultado |
|---|---|---|
| Backend, SQLite | `pytest` | **494 passaram**, 1 pulado (o teste de concorrência `FOR UPDATE`, que só roda no Postgres) |
| Backend, Postgres 18 | `TEST_DATABASE_URL=... MIGRATION_DATABASE_URL=... pytest` | **495 passaram** |
| Front, lint | `npx eslint src e2e` | 0 erros (3 avisos antigos do react-hook-form em telas que não mudaram) |
| Front, build | `npm run build` e `npm run test:build` | ok, 4 de 4 |
| Playwright, completo (9 arquivos) | `npx playwright test -c e2e` com `E2E_DATABASE_URL` | **85 passaram**, 1 pulado (token expirado: precisa de `E2E_JWT_SECRET`, como antes) |

Ambiente: Windows 11, Python 3.12.10, Node 24.15, Playwright 1.64.1 com o Chrome instalado,
Postgres 18. A suíte do Playwright rodou em três partes seguidas (base + termos, pedidos,
painel + dia real), com o mesmo servidor e o mesmo banco, porque a máquina estava com pouca
memória livre: numa rodada única anterior o processo foi encerrado pelo sistema.

## Rodada antes do deploy (11/11/2026, com "Pausar pedidos")

Depois do botão "Pausar pedidos" (migration 0006) e da troca da branch no README do backend,
com o banco de e2e recriado do zero:

| O quê | Resultado |
|---|---|
| Backend, SQLite | **499 passaram**, 1 pulado (o de concorrência, só no Postgres) |
| Backend, Postgres 18 | **500 passaram** |
| Front, lint / build / `test:build` | 0 erros (3 avisos antigos) / ok / 4 de 4 |
| Playwright, completo (9 arquivos, em 3 partes) | **86 passaram**, 1 pulado (token expirado) |

O teste novo (`painel.spec.ts`, "pausar pedidos") confere: um toque pausa, o cardápio mostra
"Pausado no momento" e a API recusa (`LOJA_FECHADA`, `motivoFechada: PAUSADA`); "Reabrir
pedidos" volta ao normal e um pedido passa; "Pausar 30 min" mostra no painel e no cardápio a
hora da volta. No backend, a pausa de 30 min termina sozinha (relógio controlado no teste).

## O "dia real" (`e2e/dia-real.spec.ts`)

Cliente no celular (390×844) e painel no tablet do balcão (820×1180), contra a API real. A
loja só age pela tela do painel; a API é chamada direto apenas para preparar o cenário (conta
nova, produto, pedido de outro cliente) e para provar que ela recusa o que a tela não deixa.

| Cenário | O que o teste confere |
|---|---|
| a. Visitante faz pedido de retirada | Cardápio "Aberto agora" sem login; carrinho com 2 itens e observação "sem calda"; "Entrar e finalizar" → cadastro com o aceite dos termos → volta ao checkout com o carrinho; total R$ 37,80 e 38 pts vindos da prévia da API; QR Code do Pix |
| b. A loja leva até o fim | O pedido aparece no painel sozinho (atualização de 10 s, sem recarregar); aceitar, confirmar Pix (com o aviso do extrato), começar preparo, pronto, concluir; a cada passo a tela do cliente muda sozinha (polling de 15 s). WhatsApp: `wa.me/5511987654321` com "Olá, Marina! Aqui é da Cremoso. Seu pedido #N está pronto para retirada." Pontos: 38 no saldo, **uma** linha no extrato; tentar concluir de novo pela API dá 409 e o saldo continua 38 |
| c. Entrega | Mínimo avisado antes de finalizar ("Faltam R$ 9,00") com o botão travado; com 3 unidades, total R$ 26,00 (R$ 8,00 de taxa); CEP obrigatório; no painel, endereço com CEP |
| d. Pix vencido | Vencido há 1 min: aparece em "Pix vencido — ainda dá pra confirmar", a loja confirma e o pedido volta à fila. Vencido há 2 h 05: não aparece para confirmar e a API recusa (409 `PEDIDO_EXPIRADO`) |
| e. Devolução | Pago, cancelado pela loja com motivo, "Marcar como DEVOLVIDO"; o cliente vê "Pagamento devolvido · A loja devolveu R$ 18,90 para você pelo Pix." sem recarregar |
| f. Esgotado | "Esgotado" no painel → no carrinho do cliente "esgotou", "Entrar e finalizar" travado e o botão do cardápio desabilitado |
| g. Loja fechada | Fora do horário: cardápio "Fechado, abre … às 10:00" e a API recusa (`LOJA_FECHADA`). Sem Pix: "A loja ainda não está recebendo pedidos pelo app." e a API recusa (`PAGAMENTO_INDISPONIVEL`). A configuração original é restaurada no fim |
| h. Isolamento | Cliente A abre o pedido de B: "Pedido não encontrado." (API: 404, também ao cancelar); o pedido de B não aparece na lista de A; `/admin/pedidos` volta para o início e a API do painel responde 403 |

O Pix vencido é real: o teste antecipa `pix_expira_em` no banco descartável (só com
`E2E_DATABASE_URL`; sem ela, o cenário d é pulado).

## Outros arquivos da suíte

`visitante`, `cliente`, `admin`, `mock-flag`, `demonstracao` (modo sem backend, inclusive o
painel), `pedidos` (cliente), `painel` (painel da loja, observação por item e prévia) e
`termos` (páginas de privacidade e regras, rodapé e aceite obrigatório no cadastro).

## Problemas achados nesta rodada (já corrigidos)

1. **Aviso "mudou de preço" sumia no carrinho** (app): duas conferências do carrinho ao mesmo
   tempo e a segunda apagava o aviso. Commit `189f172`.
2. **Testes do painel deixavam sessões abertas** (teste): cada painel continuava atualizando e
   deixava os testes seguintes lentos. Agora fecham ao fim de cada teste.
3. **Corrida no teste** (teste): o relógio do cliente avançava antes de a API do painel
   responder. O passo do painel agora espera a resposta.

## O que estes testes não cobrem

- **Aparelho de verdade:** som (o teste usa um áudio de mentira para contar as notas), tela
  sempre acesa (simulada; no aparelho exige https) e impressão (o teste só confere a comanda
  na tela, com `window.print` trocado).
- **Pix de verdade:** o código copia e cola é conferido no formato, mas nenhum Pix foi pago num
  app de banco. Ver o roteiro em `CHECKLIST_DEPLOY.md`.
- **Textos legais:** são rascunhos com campos a preencher; os testes só conferem que estão lá.

## Como repetir

```bash
# Backend no banco descartável, com o seed de dev
cd Back-end
DATABASE_URL=<url do cremoso_e2e> alembic upgrade head
DATABASE_URL=<url do cremoso_e2e> APP_ENV=dev CORS_ORIGINS=http://localhost:5173,http://localhost:5174 \
  uvicorn app.main:app --port 8080

# Em outro terminal
cd Front-end
E2E_DATABASE_URL=<url do cremoso_e2e> npx playwright test -c e2e
```
