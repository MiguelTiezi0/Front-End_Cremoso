import type {
  AuthResponse,
  LoginPayload,
  PerfilUpdatePayload,
  RegisterPayload,
  User,
} from '@/types';
import { api } from './client';

// Serviço de autenticação/perfil — conectado à API real do back-end Spring Boot.
// Sempre usa a API real (independente de VITE_USE_MOCK), que só afeta as demais
// telas que ainda não têm back-end (endereços, pedidos, pontos, notificações).

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  async me(_userId: number): Promise<User> {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  async updatePerfil(_userId: number, payload: PerfilUpdatePayload): Promise<User> {
    const { data } = await api.put<User>('/clientes/me', payload);
    return data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
