import type { Notificacao } from '@/types';
import { MOCK } from '@/config/mock';
import { api } from './client';
import { mock } from './mock/carregar';

export const notificacaoService = {
  async list(): Promise<Notificacao[]> {
    if (MOCK.notificacoes) return (await mock()).listNotificacoes();
    const { data } = await api.get<Notificacao[]>('/notificacoes');
    return data;
  },
  async markLida(id: number): Promise<void> {
    if (MOCK.notificacoes) return (await mock()).markNotificacaoLida(id);
    await api.patch(`/notificacoes/${id}/lida`);
  },
  async markTodasLidas(): Promise<void> {
    if (MOCK.notificacoes) return (await mock()).markTodasLidas();
    await api.patch('/notificacoes/lidas');
  },
};
