import type { Pedido } from '@/types';
import { api, USE_MOCK } from './client';
import { mockApi } from './mock/mockApi';

export const pedidoService = {
  async list(): Promise<Pedido[]> {
    if (USE_MOCK) return mockApi.listPedidos();
    const { data } = await api.get<Pedido[]>('/pedidos');
    return data;
  },
  async get(id: number): Promise<Pedido> {
    if (USE_MOCK) return mockApi.getPedido(id);
    const { data } = await api.get<Pedido>(`/pedidos/${id}`);
    return data;
  },
};
