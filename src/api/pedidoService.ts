import type { Pedido } from '@/types';
import { MOCK } from '@/config/mock';
import { api } from './client';
import { mock } from './mock/carregar';

export const pedidoService = {
  async list(): Promise<Pedido[]> {
    if (MOCK.pedidos) return (await mock()).listPedidos();
    const { data } = await api.get<Pedido[]>('/pedidos');
    return data;
  },
  async get(id: number): Promise<Pedido> {
    if (MOCK.pedidos) return (await mock()).getPedido(id);
    const { data } = await api.get<Pedido>(`/pedidos/${id}`);
    return data;
  },
};
