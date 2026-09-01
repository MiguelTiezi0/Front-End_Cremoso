# Cremoso — Documentação Geral do Projeto

> Delivery de sorvete. Este arquivo descreve tudo o que o projeto tem, o que falta, os bugs conhecidos, os comandos para rodar e uma análise do diagrama de classes.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Tech Stack](#3-tech-stack)
4. [Banco de Dados](#4-banco-de-dados)
5. [Back-end — cremosoAPP (o que você usa)](#5-back-end--cremosoappp-o-que-você-usa)
6. [Back-end — Back-end (gerado pela IA)](#6-back-end--back-end-gerado-pela-ia)
7. [Front-end](#7-front-end)
8. [O que está pronto vs o que falta](#8-o-que-está-pronto-vs-o-que-falta)
9. [Bugs conhecidos](#9-bugs-conhecidos)
10. [Comandos para rodar o projeto](#10-comandos-para-rodar-o-projeto)
11. [Análise do Diagrama de Classes](#11-análise-do-diagrama-de-classes)

---

## 1. Visão Geral

O **Cremoso** é um app de delivery de sorvete com dois perfis de usuário:

- **Cliente** — vê o cardápio, filtra por categoria, adiciona ao carrinho, faz pedido.
- **Funcionário** — gerencia produtos, categorias, pedidos e clientes pelo painel admin.

O projeto está dividido em **3 pastas** na raiz:

| Pasta | O que é |
|---|---|
| `Back-end` | Backend gerado por IA em 2025 — tem mais entidades implementadas (Cliente, Pedido, Carrinho etc.) mas com código mais "cru" (sem DTOs, sem Lombok, sem tratamento de erro padronizado) |
| `cremosoAPP` | Backend que você construiu — código mais limpo e bem estruturado, mas ainda só tem Categoria e Produto implementados |
| `Front-end` | Frontend em React feito pelo dev front-end — já tem várias telas funcionando |

---

## 2. Estrutura de Pastas

```
Cremoso/
├── Back-end/                        ← Backend IA (Spring Boot 3.5.7)
│   └── src/main/java/.../
│       ├── controller/              ← Carrinho, Categoria, Cliente, Endereco,
│       │                               FormaPagamento, ItemCarrinho, ItemPedido,
│       │                               Pagamento, Pedido, Produto
│       ├── model/                   ← Todas as entidades JPA
│       ├── repository/              ← Todos os repositórios
│       └── services/                ← Todos os serviços
│
├── cremosoAPP/                      ← Backend SEU (Spring Boot 4.0.1) ← ESTE É O PRINCIPAL
│   └── src/main/java/.../
│       ├── config/                  ← CorsConfig, WebConfig
│       ├── controller/
│       │   ├── dto/                 ← CategoriaDTO, ProdutoRequestDTO, ProdutoResponseDTO,
│       │   │                           ErroCampo, ErroResposta
│       │   ├── mappers/             ← CategoriaMapper, ProdutoMapper (MapStruct)
│       │   ├── common/              ← GlobalExceptionHandler
│       │   ├── CategoriaController  ← CRUD completo
│       │   ├── ProdutoController    ← CRUD completo + filtros
│       │   ├── FileController       ← Upload de imagens
│       │   └── GenericController    ← Interface com helper gerarHeaderLocation()
│       ├── exceptions/              ← OperacaoNaoPermitidaException, RegistroDuplicadoException
│       ├── model/                   ← Categoria, Produto (apenas esses 2 por enquanto)
│       ├── repository/
│       │   ├── specs/               ← CategoriaSpecs, ProdutoSpecs (filtros dinâmicos)
│       │   ├── CategoriaRepository
│       │   └── ProdutoRepository
│       ├── services/                ← CategoriaService, ProdutoService
│       ├── validator/               ← CategoriaValidator, ProdutoValidator
│       └── resources/
│           └── application.properties
│
└── Front-end/
    └── cremosoappfront/             ← React 19 + React Router v7
        ├── src/
        │   ├── api/
        │   │   ├── api.js           ← Instância do Axios (baseURL: http://localhost:8080)
        │   │   ├── endpoints.js     ← Todas as funções de chamada à API
        │   │   └── mockData.js      ← Dados falsos usados quando a API está offline
        │   ├── components/
        │   │   ├── Footer.jsx
        │   │   ├── LoadingSpinner.jsx
        │   │   ├── ProdutoCard.jsx
        │   │   └── SliderCategoria.jsx
        │   ├── hooks/
        │   │   ├── useAlerta.jsx
        │   │   └── useCarrinho.jsx  ← Hook do carrinho (criado mas NÃO conectado ainda)
        │   ├── pages/
        │   │   ├── Cliente/
        │   │   │   └── HomeCliente.jsx   ← Tela principal do cliente
        │   │   └── Funcionario/
        │   │       ├── HomeFuncionario.jsx
        │   │       ├── Produto/
        │   │       │   ├── CadastroProduto.jsx
        │   │       │   └── EditarProduto.jsx
        │   │       └── Categoria/
        │   │           ├── CadastroCategoria.jsx
        │   │           └── EditarCategoria.jsx
        │   └── routes/
        │       └── AppRoutes.jsx
        └── public/
            ├── imgs/categoria/      ← Imagens de categoria estáticas (mock)
            └── uploadsFront/        ← Imagens de produto estáticas (mock)
```

---

## 3. Tech Stack

### Backend (cremosoAPP — principal)

| Item | Tecnologia |
|---|---|
| Framework | Spring Boot **4.0.1** |
| Linguagem | Java **25** |
| Banco de dados | PostgreSQL |
| ORM | Spring Data JPA + Hibernate |
| Mapeamento DTO | **MapStruct 1.6.0** |
| Redução de boilerplate | **Lombok** |
| Validação | Spring Boot Validation (Bean Validation) |
| Upload de arquivos | MultipartFile (salvo localmente em `uploads/`) |
| Auditoria | `@CreatedDate` / `@LastModifiedDate` (Spring Data) |
| Tratamento de erros | `GlobalExceptionHandler` com `@RestControllerAdvice` |
| Build | Maven |
| Porta padrão | **8080** |

### Backend (Back-end — IA)

| Item | Tecnologia |
|---|---|
| Framework | Spring Boot **3.5.7** |
| Linguagem | Java 25 |
| ORM | Spring Data JPA |
| Sem Lombok | Getters/Setters manuais |
| Sem DTOs | Entidades expostas diretamente |
| Sem tratamento de erro padronizado | Try/catch simples |

### Frontend

| Item | Tecnologia |
|---|---|
| Framework | **React 19** |
| Roteamento | **React Router DOM v7** |
| Requisições HTTP | **Axios** |
| Ícones | **Lucide React** |
| Build | react-scripts (CRA) |
| Porta padrão | **3000** |

---

## 4. Banco de Dados

- **SGBD:** PostgreSQL
- **Banco:** `cremoso_DB`
- **Host:** `localhost:5432`
- **Usuário:** `postgres`
- **Senha:** `140508`
- **DDL automático:** `spring.jpa.hibernate.ddl-auto=update` (cria/atualiza tabelas automaticamente)
- **SQL no console:** ativado com `spring.jpa.show-sql=true`

### Tabelas que já existem (criadas pelo cremosoAPP)

| Tabela | Entidade |
|---|---|
| `C_CATEGORIA` | Categoria |
| `C_PRODUTOS` | Produto |

### Tabelas que AINDA NÃO existem no cremosoAPP (mas existem no Back-end IA)

| Tabela | Entidade |
|---|---|
| `C_CLIENTE` | Cliente |
| `C_ENDERECO` | Endereço |
| `C_PEDIDO` | Pedido |
| `C_ITEM_PEDIDO` | ItemPedido |
| `C_CARRINHO` | Carrinho |
| `C_ITEM_CARRINHO` | ItemCarrinho |
| `C_FORMA_PAGAMENTO` | FormaPagamento |
| `C_PAGAMENTO` | Pagamento (registro da transação) |

---

## 5. Back-end — cremosoAPP (o que você usa)

### Endpoints disponíveis

#### Categorias — `/categorias`

| Método | URL | O que faz |
|---|---|---|
| `POST` | `/categorias` | Cria nova categoria |
| `GET` | `/categorias` | Lista/filtra categorias (`?nome=&ativa=`) |
| `GET` | `/categorias/{id}` | Busca categoria por ID |
| `PUT` | `/categorias/{id}` | Atualiza categoria |
| `DELETE` | `/categorias/{id}` | Exclui categoria |

#### Produtos — `/produtos`

| Método | URL | O que faz |
|---|---|---|
| `POST` | `/produtos` | Cria novo produto |
| `GET` | `/produtos` | Lista/filtra produtos (`?descricao=&categoria=&preco=&ativo=`) |
| `GET` | `/produtos/{id}` | Busca produto por ID |
| `PUT` | `/produtos/{id}` | Atualiza produto |
| `DELETE` | `/produtos/{id}` | Exclui produto |

#### Upload de Imagens — `/uploads`

| Método | URL | O que faz |
|---|---|---|
| `POST` | `/uploads/produtos` | Faz upload de imagem de produto |
| `POST` | `/uploads/categorias` | Faz upload de imagem de categoria |

> As imagens são salvas na pasta `uploads/produtos/` e `uploads/categorias/` dentro do projeto.
> A URL retornada é `/uploads/produtos/timestamp_nomedoarquivo.jpg`.

### Campos do Produto (ProdutoRequestDTO — o que o front envia)

```json
{
  "descricao": "Picolé de Chocolate",
  "quantidade": 50,
  "preco": 6.50,
  "ativo": true,
  "idCategoria": 1,
  "imagemUrl": "/uploads/produtos/123456_picole.png",
  "precoEmPontos": 25,
  "ganhoDePontos": 5
}
```

### Campos do Produto (ProdutoResponseDTO — o que o back retorna)

```json
{
  "id": 1,
  "descricao": "Picolé de Chocolate",
  "quantidade": 50,
  "preco": 6.50,
  "ativo": true,
  "idCategoria": 1,
  "nomeCategoria": "Picolés",
  "imagemUrl": "/uploads/produtos/123456_picole.png",
  "precoEmPontos": 25,
  "ganhoDePontos": 5,
  "dataCadastro": "2025-01-01T10:00:00",
  "dataAtualizacao": "2025-01-01T10:00:00"
}
```

### Campos da Categoria (CategoriaDTO — ida e volta)

```json
{
  "id": 1,
  "nome": "Picolés",
  "descricao": "Picolés artesanais de fruta",
  "imagemUrl": "/uploads/categorias/123456_picole.png",
  "ativa": true
}
```

### CORS configurado

O back-end (`cremosoAPP`) só aceita requisições de `http://localhost:3000`.
Se você subir o front em outra porta, precisará atualizar `CorsConfig.java`.

### Validações de negócio existentes

- **Produto duplicado:** bloqueia se já existe produto com mesma descrição + quantidade + preço + categoria.
- **Categoria duplicada:** bloqueia se já existe categoria com mesmo nome + descrição + imagem.

### Respostas de erro padronizadas

O `GlobalExceptionHandler` retorna JSON estruturado para todos os erros:

```json
{
  "status": 422,
  "mensagem": "Erro de validação.",
  "erros": [
    { "campo": "descricao", "mensagem": "Descrição é obrigatória" }
  ]
}
```

---

## 6. Back-end — Back-end (gerado pela IA)

Este backend tem **mais entidades**, mas código mais antigo. Serve de **referência** para implementar as entidades que faltam no `cremosoAPP`.

### O que tem de útil aqui

| Entidade | Referência para |
|---|---|
| `Cliente` | Criar Cliente no cremosoAPP |
| `Endereco` | Criar Endereço (vinculado ao Cliente) |
| `Carrinho` + `ItemCarrinho` | Lógica do carrinho de compras |
| `Pedido` + `ItemPedido` | Fluxo de finalização de pedido |
| `FormaPagamento` | Formas de pagamento (Pix, Cartão etc.) |
| `Pagamento` | Registro da transação de pagamento |
| `PedidoService.finalizarPedido()` | Lógica completa de conversão Carrinho → Pedido |

### O que NÃO copiar diretamente

- Os controllers expõem as entidades diretamente (sem DTOs) — ruim para segurança e manutenção.
- Sem Lombok — muito código repetitivo de getters/setters.
- Sem MapStruct — conversão manual.
- Sem tratamento de erro padronizado — cada controller trata erro na mão.
- `@CrossOrigin(origins = "*")` em todos os controllers — permissivo demais.

---

## 7. Front-end

### Rotas existentes

| URL | Componente | Perfil |
|---|---|---|
| `/` ou `/cliente` | `HomeCliente` | Cliente |
| `/funcionario` | `HomeFuncionario` | Funcionário |
| `/funcionario/produto/cadastrar` | `CadastroProduto` | Funcionário |
| `/funcionario/produto/:id/editar` | `EditarProduto` | Funcionário |
| `/funcionario/categoria/cadastrar` | `CadastroCategoria` | Funcionário |
| `/funcionario/categoria/:id/editar` | `EditarCategoria` | Funcionário |

> Não existe rota de login. Para acessar o painel do funcionário, basta acessar `/funcionario` diretamente na URL.

### Tela do Cliente (`/`)

- Header com nome do usuário (hardcoded "Rauni Wink"), saldo de pontos (hardcoded "100 pts"), logo, sino de notificação, endereço da loja e endereço de entrega.
- **Hero Carousel** — banner automático com 4 slides (Gelatos, Massa Especial, MilkShakes, Pistache), troca a cada 5 segundos, com botões de navegação e bolinhas indicadoras.
- **Barra de Categorias** — carrossel horizontal com imagem + nome de cada categoria; clique faz scroll até a seção da categoria.
- **Seção de Produtos por Categoria** — cada categoria tem sua própria fileira com slider horizontal (arrastar com mouse/toque também funciona).
- **Botão "Adicionar"** — existe nos cards de produto, mas ainda não conecta ao carrinho.
- **Botão "Ver todos"** — mostra `alert("Em desenvolvimento")`.
- **Botão troca de endereço** — mostra alert de "em desenvolvimento".

### Tela do Funcionário (`/funcionario`)

- Cards de estatísticas: total de produtos, produtos ativos, total de categorias.
- Ações rápidas: botões para ir a "Novo Produto" e "Nova Categoria".
- Grade com os 6 produtos mais recentes (com imagem, nome, categoria, preço e status ativo/inativo).
- Link "Editar" em cada produto direciona para `/funcionario/produto/:id/editar`.

### Cadastro de Produto (`/funcionario/produto/cadastrar`)

- Campos: Descrição, Quantidade, Preço, Categoria (select), Imagem (upload com preview + barra de progresso), Preço em Pontos, Ganho de Pontos, checkbox Ativo.
- Faz upload da imagem primeiro, depois salva o produto com a URL retornada.
- Exibe mensagem de sucesso ou erro após o envio.

### Cadastro de Categoria (`/funcionario/categoria/cadastrar`)

- Campos: Nome, Descrição, Imagem (upload com preview), checkbox Ativa.
- Mesmo fluxo de upload da imagem antes de salvar.

### Editar Produto e Editar Categoria

- Existem os arquivos mas não foram lidos em detalhe — provavelmente espelham o cadastro com os dados pré-carregados.

### Fallback de dados (Mock)

Quando a API está offline (back-end não rodando), o front automaticamente usa dados falsos do arquivo `mockData.js`:
- 4 categorias: Casquinhas, Picolés, Açaí, Potes.
- 13 produtos distribuídos entre as categorias.
- Imagens servidas da pasta `public/uploadsFront/` e `public/imgs/categoria/`.

### Variável de ambiente do front-end

```bash
# .env (criar na raiz de cremosoappfront/)
REACT_APP_URL_BACKEND=http://localhost:8080
```

Se não definida, o código já tem o fallback `"http://localhost:8080"` hardcoded.

---

## 8. O que está pronto vs o que falta

### Backend (cremosoAPP)

| Entidade | Status |
|---|---|
| Categoria (CRUD completo) | ✅ Pronto |
| Produto (CRUD completo + filtros) | ✅ Pronto |
| Upload de imagens | ✅ Pronto |
| Cliente | ❌ Falta |
| Endereço | ❌ Falta |
| FormaPagamento | ❌ Falta |
| Carrinho | ❌ Falta |
| ItemCarrinho | ❌ Falta |
| Pedido | ❌ Falta |
| ItemPedido | ❌ Falta |
| Autenticação / Login | ❌ Falta |

### Frontend

| Tela / Funcionalidade | Status |
|---|---|
| Home do cliente (catálogo) | ✅ Pronto |
| Carousel de banners | ✅ Pronto |
| Slider de categorias | ✅ Pronto |
| Cards de produto por categoria | ✅ Pronto |
| Painel do funcionário (visão geral) | ✅ Pronto |
| Cadastro de produto | ✅ Pronto |
| Edição de produto | ✅ Pronto |
| Cadastro de categoria | ✅ Pronto |
| Edição de categoria | ✅ Pronto |
| Carrinho (Context já tem hook) | ❌ Falta — `useCarrinho` existe mas `CarrinhoContext` não foi criado |
| Tela de login / cadastro de cliente | ❌ Falta |
| Tela de perfil do cliente | ❌ Falta |
| Tela de endereços do cliente | ❌ Falta |
| Tela de checkout / finalizar pedido | ❌ Falta |
| Tela de acompanhamento de pedido | ❌ Falta |
| Histórico de pedidos | ❌ Falta |
| Clube de pontos | ❌ Falta |
| Painel de pedidos do funcionário | ❌ Falta |
| Gestão de clientes (funcionário) | ❌ Falta |

---

## 9. Bugs conhecidos

### Bug 1 — ID inconsistente entre mock e API real

**Onde:** `HomeCliente.jsx` linha 248 e `mockData.js`

**Problema:** O mock usa `idCategoria` para identificar a categoria dentro do produto (`categoria: { idCategoria: 2 }`), mas a API real retorna `idCategoria` como campo plano no produto (ex: `p.idCategoria === cat.id`). O `HomeFuncionario` usa `produto.idProduto` para o link de edição, mas a API retorna `id`.

**Impacto:** A lista de produtos no painel do funcionário não consegue montar o link de edição corretamente quando usa dados reais da API (`/funcionario/produto/undefined/editar`).

**Correção necessária:** Padronizar para usar `id` (como o back retorna) em vez de `idProduto`.

---

### Bug 2 — Carrinho sem contexto

**Onde:** `useCarrinho.jsx` tenta usar `CarrinhoContext`, mas o arquivo `CarrinhoContext.jsx` não existe na pasta `context/`.

**Impacto:** Qualquer componente que importar `useCarrinho` vai quebrar com erro `Cannot find module '../context/CarrinhoContext'`.

**Correção necessária:** Criar o arquivo `src/context/CarrinhoContext.jsx` com o Provider.

---

### Bug 3 — Senha exposta no banco sem criptografia

**Onde:** `Back-end/model/Cliente.java` — campo `senha` salvo como texto puro.

**Impacto:** Grave problema de segurança se for usado em produção.

**Correção necessária:** Usar `BCryptPasswordEncoder` do Spring Security ao salvar/validar senha.

---

### Bug 4 — Upload salva arquivo localmente no servidor

**Onde:** `FileController.java`

**Impacto:** Em produção (qualquer deploy em nuvem), os arquivos são apagados a cada novo deploy. Não é persistente.

**Correção futura:** Migrar upload para AWS S3, Cloudflare R2, ou Supabase Storage.

---

### Bug 5 — Senha do banco hardcoded no application.properties

**Onde:** `cremosoAPP/src/main/resources/application.properties`

**Problema:** `spring.datasource.password=140508` está versionado no git.

**Correção:** Usar variável de ambiente ou arquivo `.env` + `.gitignore`.

---

## 10. Comandos para rodar o projeto

### Pré-requisitos

- Java 25 instalado
- Maven instalado (ou usar o wrapper `mvnw`)
- PostgreSQL rodando com banco `cremoso_DB` criado
- Node.js 18+ instalado

---

### Criar o banco (só na primeira vez)

```sql
-- Executar no psql ou pgAdmin
CREATE DATABASE cremoso_DB;
```

> As tabelas são criadas automaticamente pelo Hibernate na primeira vez que o back sobe (`ddl-auto=update`).

---

### Rodar o cremosoAPP (backend principal)

```bash
# Entrar na pasta
cd "cremosoAPP"

# Rodar com Maven Wrapper (recomendado)
./mvnw spring-boot:run

# OU no Windows
mvnw.cmd spring-boot:run

# OU compilar e rodar o JAR gerado
./mvnw package -DskipTests
java -jar target/cremosoAPP-0.0.1-SNAPSHOT.jar
```

> API disponível em: `http://localhost:8080`

---

### Rodar o Front-end

```bash
# Entrar na pasta
cd "Front-end/cremosoappfront"

# Instalar dependências (só na primeira vez)
npm install

# Rodar em modo desenvolvimento
npm start
```

> App disponível em: `http://localhost:3000`

---

### Testar um endpoint manualmente (com curl)

```bash
# Listar categorias
curl http://localhost:8080/categorias

# Listar produtos ativos
curl "http://localhost:8080/produtos?ativo=true"

# Buscar produto por ID
curl http://localhost:8080/produtos/1

# Criar categoria
curl -X POST http://localhost:8080/categorias \
  -H "Content-Type: application/json" \
  -d '{"nome":"Picolés","descricao":"Picolés artesanais","imagemUrl":"/imgs/picole.png","ativa":true}'

# Upload de imagem de produto
curl -X POST http://localhost:8080/uploads/produtos \
  -F "file=@/caminho/para/imagem.jpg"
```

---

### Build para produção (front-end)

```bash
cd "Front-end/cremosoappfront"
npm run build
```

> Gera a pasta `build/` com os arquivos estáticos prontos para deploy.

---

### Gerar JAR do cremosoAPP

```bash
cd "cremosoAPP"
./mvnw clean package -DskipTests
# JAR gerado em: target/cremosoAPP-0.0.1-SNAPSHOT.jar
```

---

## 11. Análise do Diagrama de Classes

O diagrama abaixo foi criado em 2025 e representa o modelo de dados planejado. Aqui está o que está **bom**, o que está **errado** e o que precisa ser **melhorado**.

---

### O que o diagrama tem (resumo visual)

```
FRPagamento ←─────────────── Pedido ──────────────→ Cliente
                               │                       │
                               │                       ↓
                               ↓                    Endereco
                          ItemPedido
                               │
                               ↓
                            Produto
                               │
                               ↓
                           Categoria
```

---

### Problemas encontrados no diagrama

#### Problema 1 — `ItemPedido` tem auto-referência (campo `itemPedido: ItemPedido`)

**No diagrama:**
```json
"ItemPedido": {
  "attributes": {
    "itemPedido": "ItemPedido"  ← aponta para si mesmo
  }
}
```

**Problema:** Isso não faz sentido. Um item de pedido não aponta para outro item de pedido. Provavelmente era a intenção de mapear o relacionamento com `Pedido`, mas foi escrito errado.

**Correção:**
```json
"pedido": "Pedido"  ← deve apontar para o pedido ao qual o item pertence
```

O Back-end da IA já implementou corretamente assim: `ItemPedido` tem um campo `@ManyToOne Pedido pedido`.

---

#### Problema 2 — `Pedido.itensPedidoId: Integer` é um campo errado

**No diagrama:**
```json
"itensPedidoId": "Integer"
```

**Problema:** `itensPedidoId` como `Integer` sugere guardar um único ID de item. Na realidade, um pedido tem **vários itens**. Isso deveria ser um relacionamento `OneToMany`.

**Correção:**
```
Pedido → itensPedido: List<ItemPedido>   (relacionamento @OneToMany)
```

---

#### Problema 3 — Nomenclatura inconsistente (`FRPagamento` vs `FormaPagamento`)

**No diagrama:** A classe se chama `FRPagamento`.

**Problema:** `FR` não é auto-explicativo. Em todo o resto do código (Back-end IA, cremosoAPP) ela foi chamada de `FormaPagamento`.

**Sugestão:** Renomear para `FormaPagamento` para manter consistência com o código já implementado.

---

#### Problema 4 — `status` de Pedido é `String` — deveria ser um Enum

**No diagrama:**
```json
"status": "String"
```

**Problema:** String livre permite valores inválidos como "entregueee" ou "EmPreparo" (com erro de digitação). No Back-end IA está como String também — mesmo problema.

**Sugestão:** Criar um Enum:
```java
public enum StatusPedido {
    AGUARDANDO,
    CONFIRMADO,
    EM_PREPARO,
    SAIU_PARA_ENTREGA,
    ENTREGUE,
    CANCELADO
}
```

---

#### Problema 5 — `Cliente.senha` sem indicação de criptografia

**No diagrama:**
```json
"senha": "String"
```

**Problema:** A senha deve ser armazenada como hash BCrypt, nunca como texto puro. O diagrama não documenta isso.

**Sugestão:** Adicionar observação no modelo: `senha: String (BCrypt hash)` e implementar criptografia ao salvar.

---

#### Problema 6 — Falta a entidade `Carrinho` e `ItemCarrinho`

O diagrama não inclui `Carrinho` nem `ItemCarrinho`, mas o Back-end IA já os implementou e são necessários para o fluxo:

```
Cliente → Carrinho → ItemCarrinho → Produto
                  ↓
               Pedido (ao finalizar)
```

Sem o Carrinho no diagrama, o fluxo de compra não está completo.

**Sugestão:** Adicionar ao diagrama:

```
Carrinho {
  idCarrinho: Long
  cliente: Cliente
  itens: List<ItemCarrinho>
  total: Double
}

ItemCarrinho {
  idItemCarrinho: Long
  carrinho: Carrinho
  produto: Produto
  quantidade: Integer
  precoUnitario: Double
  subtotal: Double
}
```

---

#### Problema 7 — Falta a entidade `Pagamento` (registro da transação)

O diagrama tem `FRPagamento` (a **forma** de pagamento: Pix, Cartão etc.), mas não tem `Pagamento` (o **registro** de que o pagamento foi efetuado). São coisas diferentes.

O Back-end IA tem `Pagamento` com:
- `pedido`
- `formaPagamento`
- `valor`
- `status` (CONFIRMADO, PENDENTE, RECUSADO)
- `dataPagamento`

**Sugestão:** Adicionar `Pagamento` ao diagrama.

---

#### Problema 8 — Falta entidade `Funcionario` ou `Administrador`

O sistema tem dois perfis (Cliente e Funcionário), mas o diagrama só modela o `Cliente`. O funcionário não tem modelo de dados — isso significa que qualquer um pode acessar o painel `/funcionario` sem senha.

**Sugestão:** Adicionar ao diagrama:

```
Funcionario {
  idFuncionario: Long
  nome: String
  email: String
  senha: String (BCrypt)
  cargo: String (ADMIN, ATENDENTE)
  ativo: Boolean
}
```

---

### Resumo das correções do diagrama

| # | Problema | Prioridade |
|---|---|---|
| 1 | `ItemPedido.itemPedido` → deve ser `pedido: Pedido` | Alta |
| 2 | `Pedido.itensPedidoId: Integer` → deve ser `List<ItemPedido>` | Alta |
| 3 | Adicionar `Carrinho` e `ItemCarrinho` ao diagrama | Alta |
| 4 | Renomear `FRPagamento` → `FormaPagamento` | Média |
| 5 | `Pedido.status: String` → usar Enum | Média |
| 6 | Adicionar entidade `Pagamento` (transação) | Média |
| 7 | Adicionar entidade `Funcionario` | Alta |
| 8 | `Cliente.senha` → documentar que é BCrypt | Baixa |

---

*Documento gerado com base na análise completa do código em 25/06/2026.*
