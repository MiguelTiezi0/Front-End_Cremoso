import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080",
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Erro na API:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;

export const PRODUTOS = "/produtos";
export const CATEGORIAS = "/categorias";
