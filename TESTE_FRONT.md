# Teste do front contra a API Python

> 04/11/2026 · Front (React + Vite) com `VITE_USE_MOCK=false` contra a API FastAPI
> (`http://localhost:8080/api`), sobre um Postgres descartável com seed de dev.
> Testes pela interface com Playwright 1.64 no Chrome.
>
> **Rodada 3 — ajustes finais antes do commit** (seção 0). A rodada 2 (correções) está nas
> seções 1–5 e a rodada 1 (antes) está resumida na seção 6.

## Resumo

| Verificação | Rodada 1 | Rodada 2 | Rodada 3 |
|---|---|---|---|
| Playwright (suíte inteira) | 20/25 (5 falhas) | 36/36 | **41/41**, em três execuções |
| Exceções JS não tratadas na suíte | 37 | 0 | **0** |
| 404 para rotas inexistentes (`/pedidos`, `/notificacoes`) | 37 | 0 | **0** |
| Requisições bloqueadas (CORS/rede) | 0 | 0 | 0 |
| Backend pytest: SQLite / Postgres | 110 / 110 | 130 / 130 | **130 / 130** |
| `npm run build` | ok | ok | ok |
| `npm run lint` | falhava (sem eslint) | 0 erros, 3 warnings | **0 erros, 3 warnings** |
| Código do mock no bundle de produção | sim | sim | **não** |

## 0. Rodada 3 — ajustes finais

| # | Ajuste | O que foi feito | Teste |
|---|---|---|---|
| 1 | Mock seguro por padrão | `src/config/mockFlag.ts`: `USE_MOCK` só é `true` com `VITE_USE_MOCK` exatamente `"true"`, e nunca em produção. Em dev com o mock ligado aparece o aviso discreto "Modo demonstração" (canto inferior esquerdo). Atualizados `.env.example` (agora `false`) e `README.md` | `e2e/mock-flag.spec.ts`: ausente → `false`; `"1"`, `"TRUE"`, `" true"`… → `false`; `"true"` em produção → `false`. E2E: sem aviso com `VITE_USE_MOCK=false`. Verificado à parte com `VITE_USE_MOCK=true`: o aviso aparece, o login do mock funciona e nenhuma chamada vai à API |
| 1b | Mock fora do bundle de produção | **Encontrei durante o ajuste:** o código do mock ia para o build, com as senhas das contas de exemplo e um `db.ts` que grava no `localStorage` ao ser importado. Agora as flags viram `false` literal no build e os services carregam o mock com `import()` dinâmico (`src/api/mock/carregar.ts`). No `dist/`, `Senha@123`, `mock.jwt`, `cremoso.mockdb` e "Modo demonstração" aparecem em 0 arquivos | build + `grep` no `dist/` |
| 2 | Destaques mais recentes | Os 4 ativos com estoque de **id decrescente** | E2E compara com `/produtos/ativos` ordenado e confere a ordem dos cards |
| 3 | Modo misto nos pontos | O mock de pontos recebe o usuário logado e o produto: o saldo vem do `AuthContext`, há um extrato por usuário real (guardado no mock) e o resgate valida o saldo do usuário. "Usuário não encontrado." não acontece mais | E2E: conta real + produto real, com o saldo de `/auth/me` simulado em 500 (a API ainda não tem pontos) → resgate ok, extrato com o resgate, saldo 310 |
| 4 | Backoff no detalhe do pedido | `src/lib/polling.ts` (`proximoIntervalo`) é usado no detalhe do pedido e nas notificações: depois de um erro, 2 min → dobra → até 10 min; volta a 15s/30s no primeiro sucesso | revisão + lint/tsc (pedidos estão no mock, então não há como forçar o erro no e2e) |
| 5 | `e2e.zip` | Apagado. Era uma cópia de 16 MB da pasta `e2e/` com `playwright-report` | — |

**Decisão a confirmar (item 1):** em produção desliguei **todos** os mocks, inclusive os
dos módulos ainda sem backend (pedidos, endereços, pontos e notificações). Essas telas
mostram o estado de erro em vez de dados falsos. Se preferir manter o mock delas em
produção até existir backend, basta trocar `SEM_BACKEND` em `src/config/mock.ts`.

Os 5 testes que falhavam agora passam, e há 11 testes novos para os itens 2 a 7.
Na rodada 2, os únicos erros HTTP na suíte são os provocados de propósito: 401 de senha
errada, 409 de duplicidade/categoria com produtos, 400 de validação e o 500 simulado do item 2.

## 1. O que mudou

### Item 1 — Mock por módulo
- Novo `src/config/mock.ts` com uma flag por módulo. **auth, perfil, categorias e produtos**
  seguem `VITE_USE_MOCK`; **pedidos, endereços, pontos e notificações** ficam sempre no mock.
  Quando um módulo ganhar backend, basta trocar o `true` dele por `USE_MOCK` nesse arquivo.
- Todos os services (`authService`, `catalogoService`, `pedidoService`, `enderecoService`,
  `pontosService`, `notificacaoService`) usam `MOCK.<modulo>`. O `USE_MOCK` saiu do `client.ts`.
- Com `VITE_USE_MOCK=true` (padrão), auth e catálogo também usam o mock, então o app roda
  100% offline. Antes eles iam sempre para a API real.
- Documentado no `README.md` (seção "Mock por módulo") e no `.env.example`. O comentário
  antigo do `.env.example` dizia que remover a variável desligava o mock, o que estava errado:
  sem a variável, o mock fica ligado.

### Item 2 — Nenhuma exceção não tratada
- **Dashboard do cliente:** destaques e último pedido carregam separados, cada um com seu
  tratamento. Erro nos destaques mostra a mensagem com "Tentar novamente" e o resto do
  dashboard continua; erro no último pedido só esconde o card.
- **Dashboard do admin:** o `Promise.all` ganhou `catch` e mostra a mensagem de erro.
- **Perfil:** erro no histórico mostra a mensagem de erro, não "Nenhum pedido ainda".
- **NotificationProvider:** o polling roda só para role `CLIENTE`, a mesma condição do sino
  no `AppLayout`. Depois de um erro, o intervalo pula para 2 min e dobra a cada falha
  seguida, até 10 min; volta a 30s no primeiro sucesso. `refresh`, `markLida` e
  `markTodasLidas` não rejeitam mais (a marcação otimista é desfeita recarregando a lista).
- **Logout:** falha do `POST /auth/logout` não gera mais exceção (o logout local acontece igual).
- **Revisão do mesmo padrão:** Pedidos, Detalhe do pedido, Endereços, Pontos, Categorias e
  Produtos já tinham `catch`. Os `void markLida(...)` do sino e da tela de notificações
  deixaram de poder rejeitar.

### Item 3 — Destaques e catálogo
- Os destaques vêm de `GET /produtos/ativos` (novo `produtoService.listAtivos()`, com
  equivalente no mock). Mostram os **4 primeiros com estoque, na ordem da API (por id)**.
- Lista vazia mostra o estado vazio "Nenhum destaque hoje".
- **"Ver catálogo" agora leva para `/catalogo`**, uma tela nova e mínima (o cliente não tinha
  tela de catálogo): grade de produtos ativos com filtro por categoria, estados de
  carregando, vazio e erro. Também entrou no menu do cliente como "Catálogo".

### Item 4 — Sessão validada no carregamento
- Ao abrir o app com token salvo, o `AuthContext` chama `authService.me()` e atualiza nome,
  role, telefone e saldo no contexto e no storage (o mesmo escolhido no "manter-me conectado").
- **401:** limpa a sessão e o `ProtectedRoute` leva para `/login`.
- **Erro de rede/servidor:** mantém a sessão salva, para não deslogar por instabilidade.
- Enquanto valida, `initializing` segura as rotas no `FullScreenLoader` ("Carregando…"), sem
  mostrar o dashboard antes da hora.

### Item 5 — Valores nulos
- No tipo `Produto`, `precoEmPontos` e `ganhoDePontos` viraram `number | null`, e `imagemUrl`
  virou `string | null` (também é opcional no contrato).
- **Tabela do admin:** `— / —`. **Cards do cliente:** o selo de ganho mostra `—` e o preço em
  pontos mostra `—` (`formatPontos(null)`).
- **Formulário do admin:** os campos de pontos aceitam vazio, que é enviado como `null`.
  Editar um produto com pontos nulos não os transforma em 0.
- **Pontos (mock):** produtos sem preço em pontos ficam fora do resgate; o mock recusa
  resgate de produto sem preço.

### Item 6 — Detalhes visuais
- Novo componente `ProdutoImagem`: placeholder (ícone de sorvete) quando a URL está vazia,
  é nula ou não carrega. Usado na tabela e nos cards mobile do admin e no `ProdutoCard`.
- **Login:** o texto ficou "Contas de teste" e o bloco só aparece com `import.meta.env.DEV`.
  Conferi que o texto não está no bundle de produção (`npm run build`).
- **Modal de edição:** o preço aparece com duas casas (`18.90`).
- **Telefone (Cadastro e Perfil):** o input ganhou `id="telefone"`, `name`, `ref`, `onBlur` e
  `autoComplete="tel"`, e o `<label>` ficou associado. Os testes usam `getByLabel('Telefone')`.

### Item 7 — Mesmas regras no front e no back

| Campo | Regra (nos dois lados) | Front (zod) | Back (400) |
|---|---|---|---|
| Senha | ≥ 8 caracteres, ao menos uma letra e um número (no perfil, só se preenchida) | `Inclua ao menos uma letra` / `um número` | `Senha deve ter pelo menos 8 caracteres.` / `Senha deve conter pelo menos uma letra e um número.` |
| E-mail | padrão: `z.string().email()` × `EmailStr`; aceita `.online`, `.store` | `E-mail inválido` | `Formato de email inválido.` |
| Telefone | celular com DDD, 11 dígitos, o terceiro é 9, com ou sem máscara | `Informe um celular com DDD, ex.: (11) 91234-5678` | `Telefone inválido. Informe um celular com DDD, ex.: (11) 91234-5678` |

- **Back:** o telefone é normalizado para `(11) 91234-5678` antes de salvar e o domínio do
  e-mail vai para minúsculas. Entrou `email-validator==2.3.0` no `requirements.txt`. O
  `EmailStr` aceita o formato `Nome <email>`; o back recusa explicitamente para ficar igual ao zod.
- **Onde ficam as regras:** `Back-end/app/services/cliente_service.py` e
  `Front-end/src/features/auth/validation.ts`, cada um com um comentário apontando o outro.
  Também estão documentadas no `README.md` do backend.
- **Testes:** os do backend foram atualizados e ganharam domínios longos, telefone com e sem
  máscara, fixo recusado, DDD inválido e senha sem letra ou sem número (110 → 130 testes).

### Item 8 — ESLint
- `eslint.config.js` com a config flat do template React + TS do Vite (`@eslint/js`,
  `typescript-eslint`, `react-hooks` flat recommended, `react-refresh` vite). Há um bloco de
  globals Node para `e2e/` e para as configs.
- **Única mudança no template:** `@typescript-eslint/no-unused-vars` com `ignoreRestSiblings`,
  para o padrão `const { senha: _senha, ...resto } = u` do mock.

**Erros corrigidos (13):**

| Regra | Onde | Correção |
|---|---|---|
| `react-hooks/set-state-in-effect` (8) | Dashboard, Catálogo, Endereços, Pedidos, Pontos, Perfil, AuthContext, NotificationContext | Busca sem `setState` síncrono no effect (`buscar` × `carregar`), estado inicial derivado (`initializing`, `loadingPedidos`) e lista de notificações "dona" do usuário em vez de limpar no effect |
| `react-refresh/only-export-components` (1) | `Misc.tsx` exportava `STATUS_LABEL` | Movido para `src/lib/statusPedido.ts` |
| `@typescript-eslint/no-unused-vars` (3) | `mockApi.ts` (omitir campos por desestruturação) | `ignoreRestSiblings` (é intencional) |
| `react-hooks/rules-of-hooks` (1) | `e2e/fixtures.ts`: o parâmetro `use` do Playwright confundido com o hook | Parâmetro renomeado para `usar` |

**Warnings que ficaram (3), todos `react-hooks/incompatible-library`:** o React Compiler pula
componentes que usam `watch()` do react-hook-form. Não afeta o funcionamento.
- `src/features/admin/CategoriasPage.tsx:175`
- `src/features/admin/ProdutosPage.tsx:403`
- `src/features/auth/CadastroPage.tsx:49`

### Item 9 — .gitignore
- Foram adicionados `e2e/test-results/` e `e2e/playwright-report/`.

## 2. Resultado dos testes ponta a ponta (rodada 2)

| Fluxo | Resultado | O que aconteceu |
|---|---|---|
| **Visitante** | | |
| Sem login → `/login` | ok | Não há catálogo público |
| Cadastro com sucesso | ok | Entra no dashboard |
| Cadastro 409 | ok | "Já existe uma conta com este e-mail." |
| Cadastro recusado pelo back (400) | ok | Nome com mais de 100 caracteres: o front não limita e o back recusa com "Nome deve ter no máximo 100 caracteres." |
| **Novo · item 7:** domínio longo + telefone normalizado | ok | `@sorveteria.store` e `@cremoso.online` aceitos; `11987654321` salvo como `(11) 98765-4321` |
| **Novo · item 7:** regras iguais | ok | Fixo e senha sem número barrados no front; o back recusa as mesmas entradas |
| **Novo · item 6:** bloco "Contas de teste" | ok | Aparece em dev, sem "mock" |
| Cadastro inválido barrado no front | ok | Sem chamada à API |
| Login ok / senha errada (401) | ok / ok | — |
| **Cliente** | | |
| Dados e saldo após login | ok | — |
| `/auth/me` no reload | **ok (falhava)** | Chamado a cada carregamento com token |
| **Novo · item 4:** dados atualizados no reload | ok | Nome e telefone alterados por fora aparecem e são gravados no `localStorage` |
| **Novo · item 4:** loader durante a validação | ok | Com `/auth/me` segurado, mostra "Carregando…" e não mostra o dashboard |
| Destaques no dashboard | **ok (falhava)** | Os 4 primeiros ativos com estoque aparecem |
| **Novo · item 3:** destaques vazios | ok | "Nenhum destaque hoje" |
| **Novo · item 2:** destaques com erro 500 | ok | Mensagem + "Tentar novamente"; saldo continua; nenhuma exceção JS |
| **Novo · item 3:** "Ver catálogo" | ok | Abre `/catalogo` com os produtos ativos |
| **Novo · item 5:** pontos nulos no card | ok | `—` no selo e no preço em pontos, placeholder de imagem, sem `null`/`NaN` |
| Navegação sem erros de rede/JS | **ok (falhava)** | Nenhum 404, nenhuma exceção |
| Editar perfil + nova senha | ok | — |
| **Novo · item 7:** senha fraca no perfil | ok | "Inclua ao menos uma letra" |
| Perfil 409 / bloqueio de admin / logout / token inválido / token expirado | ok | — |
| **Admin** | | |
| Categorias: CRUD, 409, busca/ativas/inativas via API | ok | — |
| Produtos: CRUD, toggle, filtros na tela, filtros via API | ok | O modal mostra `18.90` |
| Navegação do admin sem erros | **ok (falhava)** | Sem polling de notificações para admin |
| Telas sem valores quebrados | **ok (falhava)** | Pontos nulos como `— / —`, placeholder; editar não transforma nulo em 0 |
| **Novo · item 6:** URL de imagem quebrada | ok | Placeholder na tabela e nos cards mobile |

Prints de depois: [`e2e/evidencias/06-depois-cliente-destaques.png`](e2e/evidencias/06-depois-cliente-destaques.png)
e [`e2e/evidencias/07-depois-admin-placeholder-e-pontos-nulos.png`](e2e/evidencias/07-depois-admin-placeholder-e-pontos-nulos.png).

### Ajustes nos meus testes durante a rodada

Nenhum deles mascara um bug do app:
- O teste de destaques passou a comparar com os 4 primeiros de `/produtos/ativos`, porque com
  o banco cheio de rodadas anteriores o produto recém-criado não entra nos 4.
- Um teste navegava antes de o login terminar; agora espera chegar ao `/dashboard`.
- Os testes do placeholder rolam até a linha ou o card antes de checar, porque as imagens são
  `loading="lazy"` e uma imagem fora da tela nem é pedida (o placeholder aparece quando a
  pessoa rola até ela).

## 3. Decisões que tomei (vale confirmar)

1. **Tela `/catalogo` criada:** o link "Ver catálogo" precisava de um destino e o cliente não
   tinha tela de produtos. Ficou mínima, só leitura, e entrou no menu do cliente.
2. **Critério dos destaques:** ~~os 4 mais antigos~~ → na rodada 3 passou a ser os 4 mais
   recentes (id decrescente).
3. **`VITE_USE_MOCK=true` também mocka auth e catálogo** (antes iam sempre para a API).
   Na rodada 3 o padrão passou a ser a API real (mock só com `"true"` e só em dev).
4. **Formato único do telefone:** `(11) 91234-5678`, o mesmo que a máscara do front gera.
5. **Sessão com servidor fora do ar:** mantém o usuário salvo em vez de deslogar. Só 401 desloga.

## 4. Limitações que ficaram

- **Modo misto:** com a API real ligada, pedidos e notificações mostram os dados de exemplo
  do mock até esses módulos terem backend. (O resgate de pontos foi resolvido na rodada 3.)
- **Itens sem teste e2e:** o erro no histórico do Perfil e o backoff do polling de notificações
  não têm teste e2e, porque pedidos e notificações estão no mock e o mock não falha. O código
  foi revisado e o lint/tsc passam; o front não tem testes unitários para cobrir isso.
- ~~**`PedidoDetalhePage`** continuava consultando a cada 15s depois de erro~~ → corrigido na
  rodada 3 (mesmo backoff das notificações).
- **Validação de e-mail:** zod e `EmailStr` coincidem nos casos comuns, mas não são idênticos em
  casos raros (ex.: e-mails com caracteres Unicode).

## 5. Arquivos alterados

- **Front:** `src/config/mock.ts` (novo), `src/components/ui/ProdutoImagem.tsx` (novo),
  `src/features/catalogo/CatalogoPage.tsx` (novo), `src/lib/statusPedido.ts` (novo),
  `eslint.config.js` (novo); services em `src/api/`, `AuthContext`, `NotificationContext`,
  `tokenStorage`, `types`, `format`, `ProdutoCard`, `AppLayout`, `Misc`, `App.tsx`, Dashboard,
  Perfil, Cadastro, Login, validações (auth e admin), Produtos (admin), Pontos, Pedidos,
  Detalhe do pedido, Endereços, mock (`mockApi`, `seed`), `README.md`, `.env.example`,
  `.gitignore`, `package.json`/`package-lock.json` (ESLint), `e2e/*`.
- **Back:** `app/services/cliente_service.py`, `tests/test_auth.py`, `tests/test_clientes.py`,
  `requirements.txt`, `README.md`.
- Sem commit nem push. O Postgres descartável, o backend e o Vite foram desligados no fim.

## 6. Rodada 1 (antes das correções) — resumo

| Problema | Causa | Corrigido em |
|---|---|---|
| Destaques do cliente vazios (print 01) | Produtos no mesmo `Promise.all` que `/pedidos` (404) | Itens 2 e 3 |
| 404 + exceções JS em Dashboard/Perfil/polling (print 02) | Telas não-mock chamando endpoints sem backend, sem `catch` | Itens 1 e 2 |
| Polling de notificações para o admin (print 03) | Provider fazia polling para qualquer usuário | Item 2 |
| `/auth/me` nunca chamado (print 04) | Sessão só restaurada do `localStorage` | Item 4 |
| Pontos nulos como `" / +"` e imagens quebradas (print 05) | Tipo assumia `number`; tabela sem fallback de imagem | Itens 5 e 6 |
| "Contas de teste (mock)", preço `18.9`, Telefone sem label | Texto, formatação, acessibilidade | Item 6 |
| Regras de senha/e-mail/telefone diferentes entre front e back | Front e back com regras próprias | Item 7 |
| `npm run lint` quebrado | ESLint não instalado, sem config | Item 8 |

Os prints 01–05 em `e2e/evidencias/` são da rodada 1.
