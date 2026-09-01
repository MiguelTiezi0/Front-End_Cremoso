import type {
  Categoria,
  CategoriaInput,
  Produto,
  ProdutoInput,
} from '@/types';
import { api } from './client';

// CRUD de Produtos e Categorias (painel administrativo) — conectado à API real.

export const categoriaService = {
  async list(): Promise<Categoria[]> {
    const { data } = await api.get<Categoria[]>('/categorias');
    return data;
  },
  async create(input: CategoriaInput): Promise<Categoria> {
    const { data } = await api.post<Categoria>('/categorias', input);
    return data;
  },
  async update(id: number, input: CategoriaInput): Promise<Categoria> {
    const { data } = await api.put<Categoria>(`/categorias/${id}`, input);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/categorias/${id}`);
  },
};

export const produtoService = {
  async list(): Promise<Produto[]> {
    const { data } = await api.get<Produto[]>('/produtos');
    return data;
  },
  async create(input: ProdutoInput): Promise<Produto> {
    const { data } = await api.post<Produto>('/produtos', input);
    return data;
  },
  async update(id: number, input: ProdutoInput): Promise<Produto> {
    const { data } = await api.put<Produto>(`/produtos/${id}`, input);
    return data;
  },
  async toggleAtivo(id: number): Promise<Produto> {
    const { data } = await api.patch<Produto>(`/produtos/${id}/ativo`);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/produtos/${id}`);
  },
};
