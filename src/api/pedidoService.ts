import type { NovoPedido, Pedido, PedidoResumo } from '@/types';
import { MOCK } from '@/config/mock';
import { api } from './client';
import { mock } from './mock/carregar';

export const pedidoService = {
  async list(): Promise<PedidoResumo[]> {
    if (MOCK.pedidos) return (await mock()).listPedidos();
    const { data } = await api.get<PedidoResumo[]>('/pedidos');
    return data;
  },
  async get(id: number): Promise<Pedido> {
    if (MOCK.pedidos) return (await mock()).getPedido(id);
    const { data } = await api.get<Pedido>(`/pedidos/${id}`);
    return data;
  },
  // A chave de idempotência faz o reenvio (rede caiu, duplo toque) devolver o MESMO pedido
  // em vez de criar outro. Quem chama guarda a chave até o pedido ser criado.
  async criar(pedido: NovoPedido, chaveIdempotencia: string): Promise<Pedido> {
    if (MOCK.pedidos) return (await mock()).criarPedido(pedido, chaveIdempotencia);
    const { data } = await api.post<Pedido>('/pedidos', pedido, {
      headers: { 'Idempotency-Key': chaveIdempotencia },
    });
    return data;
  },
  async cancelar(id: number): Promise<Pedido> {
    if (MOCK.pedidos) return (await mock()).cancelarPedido(id);
    const { data } = await api.post<Pedido>(`/pedidos/${id}/cancelar`);
    return data;
  },
};
