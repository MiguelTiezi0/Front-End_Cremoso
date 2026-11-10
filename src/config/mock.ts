import { mockLigado } from './mockFlag';

// Fonte única de verdade sobre os módulos do app: quais existem na API, quais usam o mock
// e quais aparecem para o usuário. Quando a API ganhar um módulo, mude só `BACKEND` aqui.
//
// Os objetos são literais de propósito: no build de produção as flags viram constantes e o
// bundler remove os ramos mortos (ex.: o código do mock — ver src/api/mock/carregar.ts).

// Mock em memória: só com VITE_USE_MOCK exatamente "true" e só em dev. O `!PROD &&` vem
// primeiro para virar `false` literal no build.
export const USE_MOCK = !import.meta.env.PROD && mockLigado(import.meta.env);

// Módulos que já existem na API Python.
export const BACKEND = {
  auth: true, // login, cadastro, /auth/me, logout
  perfil: true, // PUT /clientes/me
  categorias: true,
  produtos: true,
  loja: true, // GET /loja e GET /cardapio (públicos)
  pedidos: true, // cliente: criar, listar, detalhe, cancelar
  pontos: true, // saldo e extrato (créditos e estornos)
  resgate: false, // trocar pontos por produto: ainda não existe na API
  enderecos: false, // cadastro de endereços: no checkout o endereço é digitado
  notificacoes: false,
} as const;

// Usa o mock em vez da API real. É tudo ou nada: com o modo demonstração ligado, todos os
// módulos usam o mock (inclusive os que já têm backend), e o app roda sem back-end.
export const MOCK = {
  auth: USE_MOCK,
  perfil: USE_MOCK,
  categorias: USE_MOCK,
  produtos: USE_MOCK,
  loja: USE_MOCK,
  pedidos: USE_MOCK,
  enderecos: USE_MOCK,
  pontos: USE_MOCK,
  resgate: USE_MOCK,
  notificacoes: USE_MOCK,
} as const;

// Módulo aparece no app (menu, rotas e chamadas): tem backend ou o mock está ligado.
// Sem isso ele fica escondido — nem mock nem tela de erro. Na tela de pontos, saldo e
// extrato são reais; só o resgate depende de DISPONIVEL.resgate ("Em breve").
export const DISPONIVEL = {
  pedidos: BACKEND.pedidos || USE_MOCK,
  enderecos: BACKEND.enderecos || USE_MOCK,
  pontos: BACKEND.pontos || USE_MOCK,
  resgate: BACKEND.resgate || USE_MOCK,
  notificacoes: BACKEND.notificacoes || USE_MOCK,
} as const;

export type ModuloMock = keyof typeof MOCK;
