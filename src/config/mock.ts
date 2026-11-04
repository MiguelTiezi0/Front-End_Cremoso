import { mockLigado } from './mockFlag';

// Mock por módulo: true = usa o mock em memória (src/api/mock), false = usa a API real.
//
// - Módulos que JÁ EXISTEM no backend seguem USE_MOCK: só ligam com VITE_USE_MOCK=true
//   em dev. Sem a variável (ou em qualquer outro valor) usam a API real.
// - Módulos que AINDA NÃO EXISTEM no backend usam o mock em dev, mesmo com USE_MOCK
//   desligado. Quando a API ganhar o módulo, troque `SEM_BACKEND` por `USE_MOCK` aqui —
//   é o único lugar a mudar.
// - Em build de produção nenhum mock liga: essas telas mostram o estado de erro até o
//   backend existir, em vez de dados falsos.

// `!import.meta.env.PROD &&` vem primeiro de propósito: no build vira `false` literal, o
// bundler remove os ramos de mock e o código do mock (com as contas de exemplo) fica
// fora do bundle de produção — ver src/api/mock/carregar.ts.
export const USE_MOCK = !import.meta.env.PROD && mockLigado(import.meta.env);
const SEM_BACKEND = !import.meta.env.PROD;

export const MOCK = {
  // Já existem no backend
  auth: USE_MOCK, // login, cadastro, /auth/me, logout
  perfil: USE_MOCK, // PUT /clientes/me
  categorias: USE_MOCK,
  produtos: USE_MOCK,

  // Ainda sem backend
  pedidos: SEM_BACKEND,
  enderecos: SEM_BACKEND,
  pontos: SEM_BACKEND,
  notificacoes: SEM_BACKEND,
} as const;

export type ModuloMock = keyof typeof MOCK;
