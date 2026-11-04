import type {
  AuthResponse,
  LoginPayload,
  PerfilUpdatePayload,
  RegisterPayload,
  User,
} from '@/types';
import { MOCK } from '@/config/mock';
import { api } from './client';
import { mock } from './mock/carregar';

// Serviço de autenticação/perfil. Mock ou API real conforme src/config/mock.ts.

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    if (MOCK.auth) return (await mock()).login(payload);
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    if (MOCK.auth) return (await mock()).register(payload);
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  // Na API real o usuário vem do token; o mock precisa do id.
  async me(userId: number): Promise<User> {
    if (MOCK.auth) return (await mock()).me(userId);
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  async updatePerfil(userId: number, payload: PerfilUpdatePayload): Promise<User> {
    if (MOCK.perfil) return (await mock()).updatePerfil(userId, payload);
    const { data } = await api.put<User>('/clientes/me', payload);
    return data;
  },

  async logout(): Promise<void> {
    if (MOCK.auth) return;
    await api.post('/auth/logout');
  },
};
