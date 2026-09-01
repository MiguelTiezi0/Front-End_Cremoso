# Entrega 1 — Roadmap Cremoso

> Prazo: aproximadamente 1 mês a partir de 25/06/2026.
> Meta: Login/Cadastro (com Google), CRUD de Produto e Categoria, e features plus.

---

## O que já está pronto (não mexa)

| Feature | Back | Front |
|---|---|---|
| CRUD de Categoria | ✅ | ✅ |
| CRUD de Produto | ✅ | ✅ |
| Upload de imagens | ✅ | ✅ |
| Home do cliente (catálogo) | ✅ | ✅ |
| Painel do funcionário (visão geral) | ✅ | ✅ |

---

## O que precisa ser feito

### Obrigatórios

- [ ] Login com email/senha
- [ ] Cadastro de cliente
- [ ] Login com Google (OAuth2)
- [ ] Proteger rotas do funcionário (só acessa quem está logado)

### Plus sugeridos (escolha os que quiser entregar)

- [ ] Carrinho de compras funcional
- [ ] Clube de pontos visível no header (já tem campo no banco)
- [ ] Filtro de produtos por categoria na home
- [ ] Inativar produto/categoria pelo painel (toggle ativo/inativo)
- [ ] Página de perfil do cliente (ver/editar nome, email, telefone)

---

## Semana a semana

```
Semana 1 (25/06 – 01/07)  →  Back-end: Autenticação
Semana 2 (02/07 – 08/07)  →  Front-end: Login e Cadastro
Semana 3 (09/07 – 15/07)  →  Plus escolhidos
Semana 4 (16/07 – 22/07)  →  Testes, ajustes e polish
```

---

## Semana 1 — Back-end: Autenticação

> Tudo feito dentro do `cremosoAPP`. Não toca no `Back-end` da IA.

### 1.1 — Adicionar dependências no `pom.xml`

```xml
<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- JWT (token de autenticação) -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>

<!-- Google OAuth2 (para "Entrar com Google") -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

---

### 1.2 — Criar entidade `Cliente`

**Arquivo:** `model/Cliente.java`

Campos necessários:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | `Long` | PK auto gerada |
| `nome` | `String` | obrigatório |
| `email` | `String` | único, obrigatório |
| `senha` | `String` | hash BCrypt — nunca texto puro |
| `telefone` | `String` | opcional no cadastro |
| `pontos` | `Integer` | padrão 0 |
| `foto` | `String` | URL da foto (Google preenche automaticamente) |
| `ativo` | `Boolean` | padrão true |
| `googleId` | `String` | só preenchido se entrou pelo Google |
| `role` | `Enum` | `CLIENTE` ou `FUNCIONARIO` |

> O campo `role` é fundamental para separar quem pode acessar o painel do funcionário.

```java
// Enum a criar: model/enums/Role.java
public enum Role {
    CLIENTE,
    FUNCIONARIO
}
```

---

### 1.3 — Criar o fluxo de cadastro e login

**Arquivos a criar no cremosoAPP:**

```
security/
├── JwtService.java           ← gera e valida tokens JWT
├── JwtAuthFilter.java        ← intercepta requisições e valida o token
└── SecurityConfig.java       ← configura quais rotas são públicas/protegidas

controller/
├── AuthController.java       ← endpoints /auth/cadastro e /auth/login
└── dto/
    ├── CadastroDTO.java      ← { nome, email, senha, telefone }
    ├── LoginDTO.java         ← { email, senha }
    └── TokenDTO.java         ← { token, nome, email, role }
```

**Endpoints que o `AuthController` deve expor:**

| Método | URL | O que faz |
|---|---|---|
| `POST` | `/auth/cadastro` | Cria conta com email/senha |
| `POST` | `/auth/login` | Retorna o JWT se credenciais corretas |
| `GET` | `/auth/google` | Inicia fluxo OAuth2 do Google |
| `GET` | `/auth/google/callback` | Recebe código do Google e retorna JWT |

---

### 1.4 — Configurar o `SecurityConfig`

Regras de acesso:

| Rota | Quem pode acessar |
|---|---|
| `/auth/**` | Qualquer um (público) |
| `/categorias` (GET) | Qualquer um (público) |
| `/produtos` (GET) | Qualquer um (público) |
| `/categorias` (POST/PUT/DELETE) | Apenas `FUNCIONARIO` |
| `/produtos` (POST/PUT/DELETE) | Apenas `FUNCIONARIO` |
| `/uploads/**` | Apenas `FUNCIONARIO` |
| `/clientes/**` | Cliente autenticado (próprio perfil) |

---

### 1.5 — Configurar Google OAuth2 no `application.properties`

```properties
# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=SEU_CLIENT_ID_AQUI
spring.security.oauth2.client.registration.google.client-secret=SEU_CLIENT_SECRET_AQUI
spring.security.oauth2.client.registration.google.scope=email,profile
```

> Para obter o `client-id` e `client-secret`:
> 1. Acesse `console.cloud.google.com`
> 2. Crie um projeto (ou use um existente)
> 3. Vá em "APIs & Services" → "Credentials"
> 4. Clique em "Create Credentials" → "OAuth Client ID"
> 5. Tipo: "Web application"
> 6. URI de redirecionamento autorizado: `http://localhost:8080/login/oauth2/code/google`
> 7. Copie o Client ID e Client Secret para o `application.properties`

---

### 1.6 — Adicionar `ClienteRepository`

```java
// repository/ClienteRepository.java
Optional<Cliente> findByEmail(String email);
Optional<Cliente> findByGoogleId(String googleId);
boolean existsByEmail(String email);
```

---

## Semana 2 — Front-end: Login e Cadastro

> Tudo feito dentro de `Front-end/cremosoappfront`. Não toca nas páginas que já existem.

### 2.1 — Criar o contexto de autenticação

**Arquivo a criar:** `src/context/AuthContext.jsx`

O que ele guarda:
- `usuario` — objeto com `{ nome, email, role, token }`
- `login(email, senha)` — chama `/auth/login`, salva token no `localStorage`
- `loginComGoogle()` — redireciona para `/auth/google`
- `logout()` — limpa o token e o usuário
- `estaLogado` — boolean
- `eFuncionario` — boolean

**Arquivo a criar:** `src/hooks/useAuth.jsx`

```jsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function useAuth() {
  return useContext(AuthContext);
}
```

---

### 2.2 — Criar as páginas de Login e Cadastro

**Arquivos a criar:**

```
pages/
├── Login/
│   ├── Login.jsx
│   └── Login.css
└── Cadastro/
    ├── Cadastro.jsx
    └── Cadastro.css
```

**Tela de Login — o que precisa ter:**
- Campo email
- Campo senha (com opção de mostrar/ocultar)
- Botão "Entrar"
- Botão "Entrar com Google" (com ícone do Google)
- Link "Não tem conta? Cadastre-se"

**Tela de Cadastro — o que precisa ter:**
- Campo nome
- Campo email
- Campo senha
- Campo confirmar senha (validação local antes de enviar)
- Campo telefone (opcional)
- Botão "Criar conta"
- Botão "Continuar com Google"
- Link "Já tem conta? Entrar"

---

### 2.3 — Adicionar as rotas novas

**Arquivo:** `src/routes/AppRoutes.jsx` — adicionar:

```jsx
import Login from "../pages/Login/Login";
import Cadastro from "../pages/Cadastro/Cadastro";
import RotaPrivada from "./RotaPrivada";

// Adicionar nas Routes:
<Route path="/login" element={<Login />} />
<Route path="/cadastro" element={<Cadastro />} />

// Proteger as rotas do funcionário:
<Route path="/funcionario/*" element={
  <RotaPrivada role="FUNCIONARIO">
    <HomeFuncionario />
  </RotaPrivada>
} />
```

---

### 2.4 — Criar o componente `RotaPrivada`

**Arquivo a criar:** `src/routes/RotaPrivada.jsx`

Lógica: se não está logado → redireciona para `/login`. Se está logado mas não tem a role certa → redireciona para `/`.

---

### 2.5 — Adicionar token no Axios

**Arquivo:** `src/api/api.js` — adicionar interceptor que coloca o token no header:

```js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

### 2.6 — Atualizar o header da `HomeCliente`

Substituir o nome "Rauni Wink" e os pontos hardcoded pelos dados reais do `useAuth()`:

```jsx
const { usuario } = useAuth();
// usar: usuario?.nome, usuario?.pontos
```

---

## Semana 3 — Features Plus

Escolha **2 ou 3** das opções abaixo. Cada uma tem estimativa de esforço.

---

### Plus A — Carrinho de compras (esforço: alto)

**Back-end:**
- Criar entidades `Carrinho` e `ItemCarrinho` (usar Back-end IA como referência)
- Endpoints: adicionar item, remover item, ver carrinho, limpar carrinho

**Front-end:**
- Criar `src/context/CarrinhoContext.jsx` (o hook `useCarrinho` já existe)
- Ícone de carrinho no header com contador de itens
- Drawer/modal lateral com os itens e total
- Botão "Finalizar pedido" (pode levar para uma tela simples de confirmação)

---

### Plus B — Toggle ativo/inativo direto no painel (esforço: baixo)

**Back-end:** já suporta — o endpoint PUT já aceita o campo `ativo`.

**Front-end:**
- Na `HomeFuncionario`, adicionar um switch/botão ao lado de cada produto para alternar entre ativo e inativo sem precisar ir à tela de edição.
- Chamar `atualizarProduto(id, { ...produto, ativo: !produto.ativo })`.

Impacto visual alto, esforço baixo — ótimo para impressionar na entrega.

---

### Plus C — Filtro por categoria na home do cliente (esforço: baixo)

**Back-end:** já suporta — `GET /produtos?ativo=true` existe.

**Front-end:**
- O clique na barra de categorias já faz scroll para a seção.
- Adicionar também um estado de "categoria ativa" que filtra/destaca os produtos.
- Remover o `alert("Em desenvolvimento")` do botão "Ver todos" — substituir por mostrar todos os produtos da categoria.

---

### Plus D — Página de perfil do cliente (esforço: médio)

**Back-end:**
- Endpoint `GET /clientes/me` — retorna os dados do cliente logado (usa o token para identificar)
- Endpoint `PUT /clientes/me` — atualiza nome, telefone, foto

**Front-end:**
- Página `/perfil` com os dados do cliente
- Formulário para editar nome e telefone
- Exibir saldo de pontos atual

---

### Plus E — Clube de pontos visível (esforço: baixo)

**Back-end:** campo `pontos` já existe no modelo `Cliente`.

**Front-end:**
- O header já mostra "100 pts" hardcoded — conectar com o valor real do `useAuth()`.
- Adicionar tooltip ou card explicando como ganhar pontos (ex: "Compre e ganhe pontos em cada pedido").

---

## Semana 4 — Testes, ajustes e polish

### Checklist antes de entregar

**Back-end:**
- [ ] Testar todos os endpoints autenticados com token expirado (deve retornar 401)
- [ ] Testar cadastro com email duplicado (deve retornar 409)
- [ ] Testar login com senha errada (deve retornar 401, não 500)
- [ ] Verificar que rotas públicas (GET /produtos, GET /categorias) funcionam sem token
- [ ] Verificar que POST/PUT/DELETE em produto exigem role FUNCIONARIO

**Front-end:**
- [ ] Testar fluxo completo: cadastro → login → painel funcionário → criar produto
- [ ] Testar "Entrar com Google" end-to-end
- [ ] Verificar que acessar `/funcionario` sem login redireciona para `/login`
- [ ] Verificar que cliente logado não consegue acessar `/funcionario`
- [ ] Substituir todos os `alert("Em desenvolvimento")` por mensagem visual ou remover
- [ ] Testar no celular — verificar se o layout está responsivo
- [ ] Verificar se as imagens carregam corretamente (API ligada e desligada)

---

## Resumo das tarefas por arquivo

### Back-end (`cremosoAPP`) — arquivos a criar

```
model/
├── Cliente.java                  ← nova entidade
└── enums/
    └── Role.java                 ← enum CLIENTE / FUNCIONARIO

repository/
└── ClienteRepository.java        ← findByEmail, findByGoogleId

security/
├── JwtService.java               ← gerar/validar JWT
├── JwtAuthFilter.java            ← filtro de autenticação
└── SecurityConfig.java           ← config de rotas públicas/privadas

controller/
├── AuthController.java           ← /auth/cadastro, /auth/login
└── dto/
    ├── CadastroDTO.java
    ├── LoginDTO.java
    └── TokenDTO.java

services/
└── ClienteService.java           ← salvar, buscar por email, lógica de pontos
```

### Front-end (`cremosoappfront`) — arquivos a criar

```
context/
├── AuthContext.jsx               ← estado global de autenticação
└── CarrinhoContext.jsx           ← (se fizer Plus A)

hooks/
└── useAuth.jsx                   ← (CarrinhoContext já tem o hook)

pages/
├── Login/
│   ├── Login.jsx
│   └── Login.css
└── Cadastro/
    ├── Cadastro.jsx
    └── Cadastro.css

routes/
└── RotaPrivada.jsx               ← componente de proteção de rota
```

### Arquivos a modificar (não criar)

| Arquivo | O que muda |
|---|---|
| `api/api.js` | Adicionar interceptor com Bearer token |
| `routes/AppRoutes.jsx` | Adicionar rotas de login/cadastro + proteger /funcionario |
| `pages/Cliente/HomeCliente.jsx` | Usar nome/pontos reais do useAuth |
| `index.jsx` ou `App.jsx` | Envolver o app com `AuthProvider` |

---

## Ordem de execução recomendada

Se fizer tudo em ordem, cada etapa habilita a próxima:

```
1. Criar Cliente.java + ClienteRepository
       ↓
2. Criar JwtService + SecurityConfig
       ↓
3. Criar AuthController (cadastro/login com email)
       ↓
4. Testar os endpoints no Postman/curl
       ↓
5. Criar AuthContext.jsx no front
       ↓
6. Criar telas de Login e Cadastro
       ↓
7. Adicionar token no Axios + proteger rotas
       ↓
8. Integrar Google OAuth2 (back + front)
       ↓
9. Fazer os Plus escolhidos
       ↓
10. Semana de testes e polish
```

---

*Roadmap criado em 25/06/2026 com base no estado atual do projeto.*
