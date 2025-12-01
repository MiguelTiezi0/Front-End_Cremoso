# Guia de Uso do Mock Data

Este arquivo contém dados mock para testar a aplicação offline, sem dependência da API do backend.

## 📁 Arquivo

- `mockData.js` - Dados mock com categorias e produtos

## 🎯 Dados Inclusos

### Categorias (6)

1. **Sorvetes** - 8 produtos
2. **Picolés** - 6 produtos
3. **Açaí** - 5 produtos
4. **Sundae** - 5 produtos
5. **Milk Shake** - 5 produtos
6. **Bebidas** - 5 produtos

**Total: 34 produtos**

## 🔧 Como Usar

### Opção 1: Importar e usar no componente

```javascript
import { mockListarCategorias, mockListarProdutos } from "../../api/mockData";

// No seu useEffect ou componente
const carregarTudo = async () => {
  const categorias = await mockListarCategorias();
  const produtos = await mockListarProdutos();
  console.log(categorias.data);
  console.log(produtos.data);
};
```

### Opção 2: Modificar endpoints.js para usar mock (Recomendado)

**Arquivo: `src/api/endpoints.js`**

```javascript
import { mockListarCategorias, mockListarProdutos } from "./mockData";

// Comentar as chamadas reais
// export const listarCategorias = async () => { ... }
// export const listarProdutos = async () => { ... }

// Usar as funções mock
export const listarCategorias = mockListarCategorias;
export const listarProdutos = mockListarProdutos;
```

Assim o componente `HomeCliente.jsx` funcionará sem mudanças!

### Opção 3: Usar com condicional

```javascript
const useMock = true; // Mude para false para usar API real

const carregarTudo = async () => {
  try {
    const { data: categoriasData } = useMock
      ? await mockListarCategorias()
      : await listarCategorias();

    const { data: todosProdutos } = useMock
      ? await mockListarProdutos()
      : await listarProdutos();

    // resto do código...
  } catch (err) {
    console.log("Erro ao carregar", err);
  }
};
```

## 📦 Estrutura dos Dados

### Categoria

```javascript
{
  idCategoria: 1,
  nome: "Sorvetes",
  imagemUrl: "/imgs/categorias/sorvetes.jpg",
  ativa: true
}
```

### Produto

```javascript
{
  idProduto: 1,
  descricao: "Sorvete de Morango",
  preco: 12.50,
  precoEmPontos: 50,
  imagemUrl: "/uploads/sorvete-morango.jpg",
  ativo: true,
  categoria: { idCategoria: 1, id: 1 }
}
```

## ⏱️ Latência Simulada

As funções mock incluem um `delay` de 500ms para simular latência de rede real.

## 🖼️ Observação sobre Imagens

Os caminhos das imagens são fictícios e apontam para:

- `/imgs/categorias/` - Categorias
- `/uploads/` - Produtos

Você pode substituir por:

1. URLs reais (ex: imgur, cloudinary)
2. Imagens locais em `public/`
3. Data URLs base64

## ✅ Pronto para Usar!

Agora você pode testar toda a aplicação offline com dados realistas de sorveteria/gelateria! 🍦
