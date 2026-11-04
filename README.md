# 🍦 Cremoso — Front-end (Delivery de Sorvetes)

Front-end do sistema de delivery de sorvetes **Cremoso**, construído em **React + TypeScript + Vite**, com **Tailwind CSS**, **React Router**, **React Hook Form + Zod**, **Axios** e **Lucide**.

Por padrão o app usa a **API Python** (`VITE_API_BASE_URL`) nos módulos que ela já tem (auth, perfil, categorias e produtos). Para rodar **sem back-end**, use `VITE_USE_MOCK=true` em dev: tudo passa para o mock em memória (persistido em `localStorage`) e a tela mostra o aviso "Modo demonstração" — ver [Mock por módulo](#-mock-por-módulo).

---

## 🚀 Como rodar

Pré-requisitos: **Node 18+** e npm.

```bash
npm install
npm run dev
```

Acesse **http://localhost:5173**.

Outros scripts:

```bash
npm run build     # type-check + build de produção (gera /dist)
npm run preview   # serve o build de produção localmente
npm run lint      # ESLint (config flat do template React + TS do Vite)
npx playwright test -c e2e   # testes ponta a ponta contra a API real (ver e2e/README.md)
```

### Contas de teste

São as mesmas no mock e no seed de dev do backend (`APP_ENV=dev`). A tela de login só
mostra este bloco em modo dev (`npm run dev`).

| Perfil  | E-mail               | Senha       |
| ------- | -------------------- | ----------- |
| Cliente | `cliente@cremoso.com` | `Senha@123` |
| Admin   | `admin@cremoso.com`   | `Admin@123` |

> As telas de **Produtos** e **Categorias** (menu admin) só aparecem para o perfil **Admin**.
> Você também pode criar uma conta nova pela tela de cadastro (entra como Cliente).

---

## 🧩 Funcionalidades implementadas

### Módulo 1 — Autenticação e Cadastro
- **Cadastro** com validação em tempo real (e-mail, senha forte, confirmação, indicador de força da senha).
- **Login seguro** com "manter-me conectado" (sessão persistente em `localStorage` vs. `sessionStorage`).
- **Logout** com limpeza de token/estado e redirecionamento.
- **Rotas protegidas** (Auth Guard) — usuários não autenticados vão para o login; áreas admin exigem perfil ADMIN.
- **Perfil** com dados editáveis (nome, telefone, e-mail, senha) + **histórico de pedidos**.
- **Endereços de entrega** — CRUD completo (adicionar, editar, remover, marcar como padrão).

### Painel do Cliente
- **Dashboard** — saudação, saldo de pontos, status do último pedido, atalhos e destaques.
- **Pontos (fidelidade)** — saldo, extrato (ganhos/resgates) e resgate de produtos por pontos.
- **Pedidos** — listagem com filtro por status + detalhe com linha do tempo de acompanhamento (polling a cada 15s, pronto para WebSocket).
- **Notificações** — central com sino/contador no header, marcar como lida / todas como lidas (polling a cada 30s só para clientes; depois de um erro espaça para 2–10 min).

### Painel Administrativo (CRUD)
- **Produtos** — tabela/grid com busca por descrição, filtro por categoria e status; formulário com todos os campos da entidade; toggle ativar/inativar; `dataCadastro`/`dataAtualizacao` somente leitura.
- **Categorias** — CRUD equivalente (nome, descrição, imagem, ativa/inativa).

---

## 📁 Estrutura de pastas

```
src/
  api/            Cliente Axios + serviços por recurso (auth, catálogo, pedidos, pontos…)
    mock/         Mock em memória (seed + "banco" em localStorage) — REMOVER ao plugar a API
  components/     Componentes reutilizáveis
    ui/           Botões, inputs, modal, toggle, badges, loaders, estados vazios
    layout/       Header, logo, menu do usuário, sino de notificações
  context/        AuthContext, NotificationContext, ToastContext
  features/       Telas organizadas por feature
    auth/  dashboard/  pontos/  pedidos/  notificacoes/  admin/
  lib/            Helpers (formatação BRL/data, máscaras, extração de erro)
  routes/         Proteção de rotas (ProtectedRoute / PublicOnlyRoute)
  types/          Tipos TypeScript do domínio (Produto, Categoria, Pedido, …)
```

---

## 🔌 Mock por módulo

Toda comunicação passa pelos **serviços** em `src/api/*Service.ts`. Cada função tem duas
implementações: o **mock** (`src/api/mock/`) e a **chamada REST real** (Axios). Qual delas
cada módulo usa é decidido em **um único arquivo**: [`src/config/mock.ts`](src/config/mock.ts).

Três objetos nesse arquivo:
- **`BACKEND`:** quais módulos já existem na API Python. É o único lugar a mudar quando a
  API ganhar um módulo.
- **`MOCK`:** se o módulo usa o mock. O mock é tudo ou nada e segue `USE_MOCK`.
- **`DISPONIVEL`:** se o módulo aparece no app (menu, rotas e chamadas). Isso acontece
  quando ele tem backend **ou** o mock está ligado.

| Módulo | Backend | Com a API real (`VITE_USE_MOCK` ≠ `true`, e sempre em produção) | Modo demonstração (`VITE_USE_MOCK=true`, só dev) |
| --- | --- | --- | --- |
| Auth, Perfil, Categorias, Produtos | ✅ | API real | mock |
| Pedidos | ❌ | **escondido:** fora do menu, do menu do usuário, do dashboard ("Último pedido") e do perfil (histórico); a rota cai no 404 | mock |
| Endereços | ❌ | **escondido:** fora do menu do usuário; a rota cai no 404 | mock |
| Notificações | ❌ | **escondido:** sem sino e sem polling; a rota cai no 404 | mock |
| Pontos | ❌ | **visível:** saldo real de `/auth/me` (`saldoPontos`); extrato e resgate aparecem como "Em breve", sem chamar mock | mock |

**`USE_MOCK` é seguro por padrão** (`src/config/mockFlag.ts`):

| `VITE_USE_MOCK` | `npm run dev` | build de produção |
| --- | --- | --- |
| ausente, `false`, `1`, `TRUE`… | API real | API real |
| exatamente `true` | mock + aviso "Modo demonstração" | **API real** (o mock nunca liga) |

- Em produção as flags viram constantes no build: o código do mock (e as contas de exemplo)
  nem entra no bundle.
- **Quando a API ganhar um módulo**, troque `false` por `true` no `BACKEND` de
  `src/config/mock.ts`. O módulo volta ao menu e às rotas e passa a chamar a API.

```env
# .env (copie de .env.example)
VITE_API_BASE_URL=http://localhost:8080/api
VITE_USE_MOCK=false   # ou true para rodar sem back-end (só em dev)
```

Rotas que o front espera quando cada módulo ganhar backend:

| Recurso      | Método/rota                            |
| ------------ | -------------------------------------- |
| Endereços    | `GET/POST/PUT/DELETE /clientes/me/enderecos`, `PATCH /clientes/me/enderecos/{id}/padrao` |
| Pedidos      | `GET /pedidos`, `GET /pedidos/{id}`    |
| Pontos       | `GET /pontos/saldo`, `GET /pontos/extrato`, `POST /pontos/resgates` |
| Notificações | `GET /notificacoes`, `PATCH /notificacoes/{id}/lida`, `PATCH /notificacoes/lidas` |

**Sessão / JWT:** o cliente Axios injeta `Authorization: Bearer <token>` (`src/api/client.ts`)
e trata `401` limpando a sessão. Ao abrir o app com token salvo, o `AuthContext` valida a
sessão em `GET /auth/me` e atualiza nome, role e saldo de pontos (com loader até terminar).

**Remover o mock:** quando todos os módulos tiverem backend, a pasta `src/api/mock/`,
`src/config/mock.ts` e os blocos `if (MOCK.x)` dos serviços podem ser removidos.

## ▲ Deploy na Vercel

O `vercel.json` já define `npm run build` e a pasta `dist`. Em *Settings → Environment
Variables*:

| Variável | Production | Preview | Observação |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | `https://<seu-servico>.onrender.com/api` | a mesma (ou a URL de um backend de homologação) | **Obrigatória.** Sem ela o build usa `http://localhost:8080/api` e o site publicado não acha a API |
| `VITE_USE_MOCK` | não definir | não definir | Em build de produção o mock nunca liga, mesmo com `true` (as prévias também são builds de produção) |

No backend (Render), libere as origens do front:
- `CORS_ORIGINS=https://<seu-app>.vercel.app` (produção, sem `/` no fim);
- `CORS_ORIGIN_REGEX=https://<seu-app>-[a-z0-9-]+\.vercel\.app` para as URLs de prévia,
  que mudam a cada deploy.

As variáveis `VITE_*` entram no bundle **no momento do build**. Depois de mudar alguma, faça
um novo deploy (*Redeploy*) para ela valer.

### Tempo real (WebSocket)
O acompanhamento de pedidos (`PedidoDetalhePage`) e a central de notificações
(`NotificationContext`) usam **polling** hoje, mas já estão isolados em pontos únicos:
basta substituir os `setInterval` por uma assinatura de WebSocket que chame `refresh()`.

---

## ✅ Tipagem fiel ao back-end

Os tipos `Produto` e `Categoria` em `src/types/index.ts` espelham exatamente as entidades Java
fornecidas (incluindo `precoEmPontos`, `ganhoDePontos`, `dataCadastro`, `dataAtualizacao`, etc.).
Datas `LocalDateTime` chegam como string ISO no JSON e são formatadas para pt-BR na UI.
