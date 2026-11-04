import type { Endereco, EnderecoInput } from '@/types';
import { MOCK } from '@/config/mock';
import { api } from './client';
import { mock } from './mock/carregar';

export const enderecoService = {
  async list(): Promise<Endereco[]> {
    if (MOCK.enderecos) return (await mock()).listEnderecos();
    const { data } = await api.get<Endereco[]>('/clientes/me/enderecos');
    return data;
  },
  async create(input: EnderecoInput): Promise<Endereco> {
    if (MOCK.enderecos) return (await mock()).createEndereco(input);
    const { data } = await api.post<Endereco>('/clientes/me/enderecos', input);
    return data;
  },
  async update(id: number, input: EnderecoInput): Promise<Endereco> {
    if (MOCK.enderecos) return (await mock()).updateEndereco(id, input);
    const { data } = await api.put<Endereco>(`/clientes/me/enderecos/${id}`, input);
    return data;
  },
  async setPadrao(id: number): Promise<Endereco[]> {
    if (MOCK.enderecos) return (await mock()).setEnderecoPadrao(id);
    const { data } = await api.patch<Endereco[]>(`/clientes/me/enderecos/${id}/padrao`);
    return data;
  },
  async remove(id: number): Promise<void> {
    if (MOCK.enderecos) return (await mock()).deleteEndereco(id);
    await api.delete(`/clientes/me/enderecos/${id}`);
  },
};
