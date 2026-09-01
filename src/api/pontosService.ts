import type { MovimentoPontos } from '@/types';
import { api, USE_MOCK } from './client';
import { mockApi } from './mock/mockApi';

export const pontosService = {
  async saldo(userId: number): Promise<number> {
    if (USE_MOCK) return mockApi.getSaldoPontos(userId);
    const { data } = await api.get<{ saldo: number }>('/pontos/saldo');
    return data.saldo;
  },
  async extrato(): Promise<MovimentoPontos[]> {
    if (USE_MOCK) return mockApi.listMovimentosPontos();
    const { data } = await api.get<MovimentoPontos[]>('/pontos/extrato');
    return data;
  },
  async resgatar(userId: number, produtoId: number): Promise<MovimentoPontos> {
    if (USE_MOCK) return mockApi.resgatarProduto(userId, produtoId);
    const { data } = await api.post<MovimentoPontos>('/pontos/resgates', { produtoId });
    return data;
  },
};
