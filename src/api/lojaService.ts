import type { Cardapio, Loja } from '@/types';
import { MOCK } from '@/config/mock';
import { api } from './client';
import { mock } from './mock/carregar';

// Rotas públicas (sem login): status da loja e cardápio. A API manda Cache-Control: no-store,
// então esgotado e preço chegam sempre atualizados.
export const lojaService = {
  async status(): Promise<Loja> {
    if (MOCK.loja) return (await mock()).getLoja();
    const { data } = await api.get<Loja>('/loja');
    return data;
  },
  async cardapio(): Promise<Cardapio> {
    if (MOCK.loja) return (await mock()).getCardapio();
    const { data } = await api.get<Cardapio>('/cardapio');
    return data;
  },
};
