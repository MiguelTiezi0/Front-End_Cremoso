// Tipos TypeScript do domínio Cremoso.
// Espelham as entidades do back-end (Spring Boot). Datas chegam como string ISO
// (LocalDateTime serializado em JSON) e são tratadas como string no front-end.

// ---------------------------------------------------------------------------
// Catálogo — Produto e Categoria (fiéis às entidades Java fornecidas)
// ---------------------------------------------------------------------------

export interface Categoria {
  id: number;
  nome: string;
  descricao: string;
  imagemUrl: string;
  ativa: boolean;
}

export interface Produto {
  id: number;
  descricao: string;
  quantidade: number;
  preco: number;
  ativo: boolean;
  categoria: Categoria;
  imagemUrl: string;
  precoEmPontos: number;
  ganhoDePontos: number;
  dataCadastro: string; // ISO — somente leitura (preenchido pelo back-end)
  dataAtualizacao: string; // ISO — somente leitura
}

// Payload enviado ao criar/editar produto (categoria referenciada por id).
export interface ProdutoInput {
  descricao: string;
  quantidade: number;
  preco: number;
  ativo: boolean;
  categoriaId: number;
  imagemUrl: string;
  precoEmPontos: number;
  ganhoDePontos: number;
}

export interface CategoriaInput {
  nome: string;
  descricao: string;
  imagemUrl: string;
  ativa: boolean;
}

// ---------------------------------------------------------------------------
// Autenticação / Usuário
// ---------------------------------------------------------------------------

export type UserRole = 'CLIENTE' | 'ADMIN';

export interface User {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  role: UserRole;
  saldoPontos: number;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  senha: string;
  lembrarMe?: boolean;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
}

export interface PerfilUpdatePayload {
  nome: string;
  email: string;
  telefone: string;
  senha?: string; // opcional — só troca se preenchido
}

// ---------------------------------------------------------------------------
// Endereços de entrega
// ---------------------------------------------------------------------------

export interface Endereco {
  id: number;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  cep: string;
  pontoReferencia?: string;
  padrao: boolean;
}

export type EnderecoInput = Omit<Endereco, 'id'>;

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export type StatusPedido =
  | 'RECEBIDO'
  | 'EM_PREPARO'
  | 'SAIU_PARA_ENTREGA'
  | 'ENTREGUE'
  | 'CANCELADO';

export type FormaPagamento = 'PIX' | 'CARTAO' | 'DINHEIRO' | 'PONTOS';
export type TipoEntrega = 'ENTREGA' | 'RETIRADA';

export interface ItemPedido {
  produtoId: number;
  descricao: string;
  imagemUrl: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

export interface Pedido {
  id: number;
  data: string; // ISO
  status: StatusPedido;
  itens: ItemPedido[];
  subtotal: number;
  frete: number;
  total: number;
  formaPagamento: FormaPagamento;
  tipoEntrega: TipoEntrega;
  endereco?: Endereco; // ausente quando tipoEntrega === 'RETIRADA'
  pontosGanhos: number;
}

// ---------------------------------------------------------------------------
// Fidelidade / Pontos
// ---------------------------------------------------------------------------

export type TipoMovimentoPontos = 'GANHO' | 'RESGATE';

export interface MovimentoPontos {
  id: number;
  data: string; // ISO
  tipo: TipoMovimentoPontos;
  pontos: number; // positivo p/ ganho, negativo p/ resgate
  descricao: string;
  pedidoId?: number;
}

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------

export type TipoNotificacao = 'PEDIDO' | 'PONTOS' | 'PROMOCAO' | 'SISTEMA';

export interface Notificacao {
  id: number;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  data: string; // ISO
  lida: boolean;
}
