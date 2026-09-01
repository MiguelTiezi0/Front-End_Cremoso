# 🍦 Cremoso — Front-end (Delivery de Sorvetes)

Front-end do sistema de delivery de sorvetes **Cremoso**, construído em **React + TypeScript + Vite**, com **Tailwind CSS**, **React Router**, **React Hook Form + Zod**, **Axios** e **Lucide**.

O app funciona **100% com dados mockados** (mock em memória persistido em `localStorage`), sem precisar do back-end. Quando a API Spring Boot estiver pronta, basta trocar uma variável de ambiente e os endpoints.

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
```

### Contas de teste (mock)

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
- **Notificações** — central com sino/contador no header, marcar como lida / todas como lidas (polling a cada 30s).

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

## 🔌 Onde plugar a API real

Toda comunicação passa pelos **serviços** em `src/api/*Service.ts`. Cada função tem duas
implementações: o **mock** e a **chamada REST real** (via Axios). O switch é a flag `USE_MOCK`.

1. **Configurar variáveis de ambiente** — copie `.env.example` para `.env` e ajuste:

   ```env
   VITE_API_BASE_URL=http://localhost:8080/api
   VITE_USE_MOCK=false
   ```

   Com `VITE_USE_MOCK=false`, os serviços passam a usar o Axios (`src/api/client.ts`)
   em vez do mock — sem mais nenhuma alteração de código necessária.

2. **Ajustar os endpoints** — confira/edite as rotas em cada `*Service.ts` para casar com
   o contrato do back-end. Exemplos usados hoje:

   | Recurso      | Método/rota (exemplo)                  |
   | ------------ | -------------------------------------- |
   | Login        | `POST /auth/login`                     |
   | Cadastro     | `POST /auth/register`                  |
   | Perfil       | `PUT /clientes/me`                     |
   | Endereços    | `GET/POST/PUT/DELETE /clientes/me/enderecos` |
   | Produtos     | `GET/POST/PUT/DELETE /produtos` + `PATCH /produtos/{id}/ativo` |
   | Categorias   | `GET/POST/PUT/DELETE /categorias`      |
   | Pedidos      | `GET /pedidos`, `GET /pedidos/{id}`    |
   | Pontos       | `GET /pontos/saldo`, `GET /pontos/extrato`, `POST /pontos/resgates` |
   | Notificações | `GET /notificacoes`, `PATCH /notificacoes/{id}/lida` |

3. **Token JWT** — o cliente Axios já injeta `Authorization: Bearer <token>`
   (`src/api/client.ts`) e trata `401` limpando a sessão. Se o back-end usar **cookie httpOnly**,
   habilite `withCredentials: true` no client e remova o uso do `tokenStorage`.

4. **Remover o mock** — quando tudo estiver integrado, a pasta `src/api/mock/` e os blocos
   `if (USE_MOCK)` dos serviços podem ser removidos.

### Tempo real (WebSocket)
O acompanhamento de pedidos (`PedidoDetalhePage`) e a central de notificações
(`NotificationContext`) usam **polling** hoje, mas já estão isolados em pontos únicos:
basta substituir os `setInterval` por uma assinatura de WebSocket que chame `refresh()`.

---

## ✅ Tipagem fiel ao back-end

Os tipos `Produto` e `Categoria` em `src/types/index.ts` espelham exatamente as entidades Java
fornecidas (incluindo `precoEmPontos`, `ganhoDePontos`, `dataCadastro`, `dataAtualizacao`, etc.).
Datas `LocalDateTime` chegam como string ISO no JSON e são formatadas para pt-BR na UI.
