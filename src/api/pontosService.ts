import type { MovimentoPontos, Produto, User } from '@/types';
import { MOCK } from '@/config/mock';
import { api } from './client';
import { mock } from './mock/carregar';

// Recebe o usuário logado (AuthContext) e o produto, e não só ids: assim o mock de pontos
// funciona também com usuários e produtos da API real (modo misto). A API real usa o
// usuário do token.
export const pontosService = {
  async saldo(user: User): Promise<number> {
    if (MOCK.pontos) return (await mock()).getSaldoPontos(user);
    const { data } = await api.get<{ saldo: number }>('/pontos/saldo');
    return data.saldo;
  },
  async extrato(user: User): Promise<MovimentoPontos[]> {
    if (MOCK.pontos) return (await mock()).listMovimentosPontos(user);
    const { data } = await api.get<MovimentoPontos[]>('/pontos/extrato');
    return data;
  },
  // Só existe no mock (DISPONIVEL.resgate): a API ainda não tem resgate.
  async resgatar(user: User, produto: Produto): Promise<MovimentoPontos> {
    if (MOCK.resgate) return (await mock()).resgatarProduto(user, produto);
    const { data } = await api.post<MovimentoPontos>('/pontos/resgates', { produtoId: produto.id });
    return data;
  },
};
