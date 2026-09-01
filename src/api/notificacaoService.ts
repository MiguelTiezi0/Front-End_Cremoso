import type { Notificacao } from '@/types';
import { api, USE_MOCK } from './client';
import { mockApi } from './mock/mockApi';

export const notificacaoService = {
  async list(): Promise<Notificacao[]> {
    if (USE_MOCK) return mockApi.listNotificacoes();
    const { data } = await api.get<Notificacao[]>('/notificacoes');
    return data;
  },
  async markLida(id: number): Promise<void> {
    if (USE_MOCK) return mockApi.markNotificacaoLida(id);
    await api.patch(`/notificacoes/${id}/lida`);
  },
  async markTodasLidas(): Promise<void> {
    if (USE_MOCK) return mockApi.markTodasLidas();
    await api.patch('/notificacoes/lidas');
  },
};
