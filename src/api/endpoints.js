import api, { PRODUTOS, CATEGORIAS } from './api.js';

// CATEGORIAS - CRUD Completo
import { mockListarCategorias, mockListarProdutos } from './mockData.js';

// CATEGORIAS - CRUD Completo
export const criarCategoria = (dados) => api.post(CATEGORIAS, dados);

export const listarCategorias = async () => {
  try {
    return await api.get(CATEGORIAS);
  } catch (error) {
    console.log('Erro ao listar categorias da API, usando mock:', error.message);
    return await mockListarCategorias();
  }
};

export const buscarCategoria = (id) => api.get(`${CATEGORIAS}/${id}`);
export const atualizarCategoria = (id, dados) => api.put(`${CATEGORIAS}/${id}`, dados);
export const deletarCategoria = (id) => api.delete(`${CATEGORIAS}/${id}`);

// PRODUTOS - CRUD Completo
export const criarProduto = (dados) => api.post(PRODUTOS, dados);

export const listarProdutos = async () => {
  try {
    return await api.get(PRODUTOS);
  } catch (error) {
    console.log('Erro ao listar produtos da API, usando mock:', error.message);
    return await mockListarProdutos();
  }
};

export const listarProdutosHome = async () => {
  try {
    return await api.get(`${PRODUTOS}?page=0&size=12&sort=createdAt,desc`);
  } catch (error) {
    console.log('Erro ao listar produtos home da API, usando mock:', error.message);
    return await mockListarProdutos();
  }
};
export const buscarProduto = (id) => api.get(`${PRODUTOS}/${id}`);
export const atualizarProduto = (id, dados) => api.put(`${PRODUTOS}/${id}`, dados);
export const deletarProduto = (id) => api.delete(`${PRODUTOS}/${id}`);

// Filtros para produtos
export const listarProdutosPorCategoria = (categoriaId) => api.get(`${PRODUTOS}?categoriaId=${categoriaId}`);
export const buscarProdutos = (query) => api.get(`${PRODUTOS}?q=${query}`);

// UPLOAD DE IMAGENS - Genérico para produtos e categorias
export const uploadImagem = (file, pasta = 'produtos', onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(`/uploads/${pasta}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(progress);
      }
    }
  });
};
