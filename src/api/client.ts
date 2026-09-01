import axios, { AxiosError } from 'axios';
import { tokenStorage } from './tokenStorage';

// Cliente Axios central. Todas as chamadas REAIS à API devem passar por aqui.
// A URL base vem de VITE_API_BASE_URL (ver .env.example).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
  // withCredentials: true, // <- habilite se o back-end usar cookie httpOnly
});

// --- Request interceptor: injeta o token JWT no header Authorization ---------
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: trata 401 (sessão expirada) ----------------------
// Ponto de extensão para renovação via refresh token. Como o back-end ainda não
// existe, apenas limpamos a sessão e emitimos um evento que o AuthContext escuta.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      tokenStorage.clear();
      window.dispatchEvent(new CustomEvent('cremoso:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';
