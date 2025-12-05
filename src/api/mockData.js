// Mock data para testes offline - Sorveteria/Gelateria Cremoso

export const mockCategorias = [
    {
        idCategoria: 1,
        nome: "Casquinhas",
        imagemUrl: "/imgs/categoria/casquinhaCategoria.png",
        ativa: true,
    },
    {
        idCategoria: 2,
        nome: "Picolés",
        imagemUrl: "/imgs/categoria/picoleCategoria.png",
        ativa: true,
    },
    {
        idCategoria: 3,
        nome: "Açaí",
        imagemUrl: "/imgs/categoria/açaiCategoria.png",
        ativa: true,
    },
    {
        idCategoria: 4,
        nome: "Potes",
        imagemUrl: "/imgs/categoria/poteCategoria.png",
        ativa: true,
    }
];

export const mockProdutos = [
    // Picolés (categoria 2)
    {
        idProduto: 1,
        descricao: "Picolé de Chocolate",
        preco: 6.50,
        precoEmPontos: 25,
        imagemUrl: "/uploadsFront/picole1.png",
        ativo: true,
        categoria: { idCategoria: 2, id: 2 },
    },
    {
        idProduto: 2,
        descricao: "Picolé de Morango",
        preco: 6.00,
        precoEmPontos: 24,
        imagemUrl: "/uploadsFront/picole2.png",
        ativo: true,
        categoria: { idCategoria: 2, id: 2 },
    },
    {
        idProduto: 3,
        descricao: "Picolé Bombom",
        preco: 7.50,
        precoEmPontos: 30,
        imagemUrl: "/uploadsFront/picole3.png",
        ativo: true,
        categoria: { idCategoria: 2, id: 2 },
    },
    {
        idProduto: 4,
        descricao: "Picolé Uva",
        preco: 6.00,
        precoEmPontos: 24,
        imagemUrl: "/uploadsFront/picole4.png",
        ativo: true,
        categoria: { idCategoria: 2, id: 2 },
    },
    {
        idProduto: 5,
        descricao: "Picolé Chocolate Premium",
        preco: 7.00,
        precoEmPontos: 28,
        imagemUrl: "/uploadsFront/picole5.png",
        ativo: true,
        categoria: { idCategoria: 2, id: 2 },
    },
    {
        idProduto: 6,
        descricao: "Picolé Maracujá",
        preco: 5.50,
        precoEmPontos: 22,
        imagemUrl: "/uploadsFront/picole6.png",
        ativo: true,
        categoria: { idCategoria: 2, id: 2 },
    },
    {
        idProduto: 7,
        descricao: "Picolé Chocolate Crocante",
        preco: 8.00,
        precoEmPontos: 32,
        imagemUrl: "/uploadsFront/picole1.png",
        ativo: true,
        categoria: { idCategoria: 2, id: 2 },
    },

    // Açaí (categoria 3)
    {
        idProduto: 8,
        descricao: "Açaí no Pote 300ml",
        preco: 16.00,
        precoEmPontos: 64,
        imagemUrl: "/uploadsFront/açaiPote.png",
        ativo: true,
        categoria: { idCategoria: 3, id: 3 },
    },
    {
        idProduto: 9,
        descricao: "Açaí no Copo 500ml",
        preco: 20.00,
        precoEmPontos: 80,
        imagemUrl: "/uploadsFront/açaiCopo.png",
        ativo: true,
        categoria: { idCategoria: 3, id: 3 },
    },

    // Potes (categoria 4)
    {
        idProduto: 10,
        descricao: "Pote Hershey's 1L",
        preco: 32.00,
        precoEmPontos: 128,
        imagemUrl: "/uploadsFront/Pote.png",
        ativo: true,
        categoria: { idCategoria: 4, id: 4 },
    },

    // Casquinhas (categoria 1)
    {
        idProduto: 11,
        descricao: "Casquinha Baunilha",
        preco: 4.50,
        precoEmPontos: 18,
        imagemUrl: "/uploadsFront/casquinhaBaunilha.png",
        ativo: true,
        categoria: { idCategoria: 1, id: 1 },
    },
    {
        idProduto: 12,
        descricao: "Casquinha Chocolate",
        preco: 4.50,
        precoEmPontos: 18,
        imagemUrl: "/uploadsFront/casquinhaChocolate.png",
        ativo: true,
        categoria: { idCategoria: 1, id: 1 },
    },
    {
        idProduto: 13,
        descricao: "Casquinha Mista",
        preco: 5.00,
        precoEmPontos: 20,
        imagemUrl: "/uploadsFront/casquinhaMista.png",
        ativo: true,
        categoria: { idCategoria: 1, id: 1 },
    },
];

// Função para simular delay de API
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Função mock para listar categorias
export const mockListarCategorias = async () => {
    console.log(mockCategorias);
    await delay(500);
    return {
        data: mockCategorias,
        status: 200,
    };
};

// Função mock para listar produtos
export const mockListarProdutos = async () => {
    console.log(mockProdutos);
    await delay(500);
    return {
        data: mockProdutos,
        status: 200,
    };
};
