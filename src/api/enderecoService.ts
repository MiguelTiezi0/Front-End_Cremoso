import type { Endereco, EnderecoInput } from '@/types';
import { api, USE_MOCK } from './client';
import { mockApi } from './mock/mockApi';

export const enderecoService = {
  async list(): Promise<Endereco[]> {
    if (USE_MOCK) return mockApi.listEnderecos();
    const { data } = await api.get<Endereco[]>('/clientes/me/enderecos');
    return data;
  },
  async create(input: EnderecoInput): Promise<Endereco> {
    if (USE_MOCK) return mockApi.createEndereco(input);
    const { data } = await api.post<Endereco>('/clientes/me/enderecos', input);
    return data;
  },
  async update(id: number, input: EnderecoInput): Promise<Endereco> {
    if (USE_MOCK) return mockApi.updateEndereco(id, input);
    const { data } = await api.put<Endereco>(`/clientes/me/enderecos/${id}`, input);
    return data;
  },
  async setPadrao(id: number): Promise<Endereco[]> {
    if (USE_MOCK) return mockApi.setEnderecoPadrao(id);
    const { data } = await api.patch<Endereco[]>(`/clientes/me/enderecos/${id}/padrao`);
    return data;
  },
  async remove(id: number): Promise<void> {
    if (USE_MOCK) return mockApi.deleteEndereco(id);
    await api.delete(`/clientes/me/enderecos/${id}`);
  },
};
