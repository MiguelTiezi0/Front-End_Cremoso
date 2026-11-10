import type {
  Categoria,
  Endereco,
  MovimentoPontos,
  Notificacao,
  Pedido,
} from '@/types';
import {
  MockUser,
  seedCategorias,
  seedEnderecos,
  seedMovimentos,
  seedNotificacoes,
  seedPedidos,
  seedProdutos,
  seedUsers,
} from './seed';
import type { Produto } from '@/types';

// "Banco de dados" em memória do mock, persistido em localStorage para que os dados
// sobrevivam a recarregamentos da página. Substitua tudo isto pela API real.

interface DbShape {
  users: MockUser[];
  categorias: Categoria[];
  produtos: Produto[];
  enderecos: Endereco[];
  pedidos: Pedido[];
  movimentos: MovimentoPontos[]; // extrato de exemplo dos usuários do próprio mock
  // Extrato de pontos de usuários que não são do mock (modo misto: login pela API real),
  // por id do usuário. Opcional para continuar lendo bancos já salvos no localStorage.
  movimentosPorUsuario?: Record<string, MovimentoPontos[]>;
  notificacoes: Notificacao[];
  // Idempotency-Key → id do pedido criado (reenvio devolve o mesmo pedido).
  chavesPedido?: Record<string, number>;
}

const DB_KEY = 'cremoso.mockdb.v2';

function seedDb(): DbShape {
  return {
    users: structuredClone(seedUsers),
    categorias: structuredClone(seedCategorias),
    produtos: structuredClone(seedProdutos),
    enderecos: structuredClone(seedEnderecos),
    pedidos: structuredClone(seedPedidos),
    movimentos: structuredClone(seedMovimentos),
    notificacoes: structuredClone(seedNotificacoes),
  };
}

function load(): DbShape {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DbShape;
    } catch {
      /* cai no seed */
    }
  }
  const fresh = seedDb();
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  return fresh;
}

export const db: DbShape = load();

export function persist(): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDb(): void {
  const fresh = seedDb();
  Object.assign(db, fresh);
  persist();
}

let seq = 9000;
export const nextId = (): number => ++seq;
