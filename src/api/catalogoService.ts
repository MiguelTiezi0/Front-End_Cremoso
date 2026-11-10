import type {
  Categoria,
  CategoriaInput,
  Produto,
  ProdutoInput,
} from '@/types';
import { MOCK } from '@/config/mock';
import { api } from './client';
import { mock } from './mock/carregar';

// CRUD de Produtos e Categorias. Mock ou API real conforme src/config/mock.ts.

export const categoriaService = {
  async list(): Promise<Categoria[]> {
    if (MOCK.categorias) return (await mock()).listCategorias();
    const { data } = await api.get<Categoria[]>('/categorias');
    return data;
  },
  async create(input: CategoriaInput): Promise<Categoria> {
    if (MOCK.categorias) return (await mock()).createCategoria(input);
    const { data } = await api.post<Categoria>('/categorias', input);
    return data;
  },
  async update(id: number, input: CategoriaInput): Promise<Categoria> {
    if (MOCK.categorias) return (await mock()).updateCategoria(id, input);
    const { data } = await api.put<Categoria>(`/categorias/${id}`, input);
    return data;
  },
  async remove(id: number): Promise<void> {
    if (MOCK.categorias) return (await mock()).deleteCategoria(id);
    await api.delete(`/categorias/${id}`);
  },
};

export const produtoService = {
  async list(): Promise<Produto[]> {
    if (MOCK.produtos) return (await mock()).listProdutos();
    const { data } = await api.get<Produto[]>('/produtos');
    return data;
  },
  async listAtivos(): Promise<Produto[]> {
    if (MOCK.produtos) return (await (await mock()).listProdutos()).filter((p) => p.ativo);
    const { data } = await api.get<Produto[]>('/produtos/ativos');
    return data;
  },
  async create(input: ProdutoInput): Promise<Produto> {
    if (MOCK.produtos) return (await mock()).createProduto(input);
    const { data } = await api.post<Produto>('/produtos', input);
    return data;
  },
  async update(id: number, input: ProdutoInput): Promise<Produto> {
    if (MOCK.produtos) return (await mock()).updateProduto(id, input);
    const { data } = await api.put<Produto>(`/produtos/${id}`, input);
    return data;
  },
  async toggleAtivo(id: number): Promise<Produto> {
    if (MOCK.produtos) return (await mock()).toggleProdutoAtivo(id);
    const { data } = await api.patch<Produto>(`/produtos/${id}/ativo`);
    return data;
  },
  // "Acabou hoje": some do pedido sem desativar o produto (separado do ativo).
  async marcarEsgotado(id: number, esgotado: boolean): Promise<Produto> {
    if (MOCK.produtos) return (await mock()).marcarEsgotado(id, esgotado);
    const { data } = await api.patch<Produto>(`/produtos/${id}/esgotado`, { esgotado });
    return data;
  },
  async remove(id: number): Promise<void> {
    if (MOCK.produtos) return (await mock()).deleteProduto(id);
    await api.delete(`/produtos/${id}`);
  },
};
