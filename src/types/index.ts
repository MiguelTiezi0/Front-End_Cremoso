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
  // Opcionais no contrato da API: podem vir null.
  imagemUrl: string | null;
  precoEmPontos: number | null;
  ganhoDePontos: number | null;
  esgotado?: boolean; // Entrega 2: marcado pela loja (o cardápio público usa este campo)
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
  precoEmPontos: number | null;
  ganhoDePontos: number | null;
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
// Loja e cardápio (públicos: GET /loja e GET /cardapio, sem login)
// ---------------------------------------------------------------------------

export type MotivoLojaFechada = 'PAUSADA' | 'PAGAMENTO_NAO_CONFIGURADO' | 'FORA_DO_HORARIO';

export interface HorarioLoja {
  diaSemana: number; // 0 = segunda ... 6 = domingo
  abre: string; // "13:00"
  fecha: string;
}

export interface Loja {
  nome: string;
  cidade: string | null;
  aberta: boolean;
  motivoFechada: MotivoLojaFechada | null;
  proximaAbertura: string | null; // ISO com fuso da loja
  horarios: HorarioLoja[];
  entregaAtiva: boolean;
  taxaEntrega: number;
  pedidoMinimo: number | null; // só para entrega
  formasPagamento: FormaPagamento[];
  whatsapp: string | null;
}

export interface ProdutoCardapio {
  id: number;
  descricao: string;
  preco: number;
  imagemUrl: string | null;
  ganhoDePontos: number | null;
  esgotado: boolean;
}

export interface CategoriaCardapio {
  id: number;
  nome: string;
  descricao: string;
  imagemUrl: string;
  produtos: ProdutoCardapio[];
}

export interface Cardapio {
  categorias: CategoriaCardapio[];
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export type StatusPedido =
  | 'RECEBIDO'
  | 'ACEITO'
  | 'EM_PREPARO'
  | 'PRONTO'
  | 'SAIU_PARA_ENTREGA'
  | 'CONCLUIDO'
  | 'CANCELADO';

export type StatusPagamento = 'PENDENTE' | 'CONFIRMADO' | 'DEVOLVIDO';

// Só pagamento online (Pix) por enquanto.
export type FormaPagamento = 'PIX';
export type TipoEntrega = 'ENTREGA' | 'RETIRADA';

export interface ItemPedido {
  produtoId: number;
  descricao: string;
  imagemUrl: string | null;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
  pontos: number;
}

export interface EnderecoEntrega {
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  referencia: string | null;
}

export interface PixPedido {
  copiaECola: string;
  valor: number;
  expiraEm: string; // ISO
}

export interface HistoricoPedido {
  status: StatusPedido;
  em: string; // ISO
}

// GET /pedidos/{id}
export interface Pedido {
  id: number;
  data: string; // ISO
  status: StatusPedido;
  statusPagamento: StatusPagamento;
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  itens: ItemPedido[];
  subtotal: number;
  frete: number;
  total: number;
  pontosGanhos: number;
  pontosCreditados: boolean;
  pix: PixPedido | null; // só enquanto o pagamento está pendente
  endereco: EnderecoEntrega | null; // null na retirada
  observacao: string | null;
  podeCancelar: boolean;
  motivoCancelamento: string | null; // "PIX_EXPIRADO" quando o sistema cancela
  canceladoPor: 'CLIENTE' | 'LOJA' | 'SISTEMA' | null;
  historico: HistoricoPedido[];
}

// GET /pedidos (lista)
export interface PedidoResumo {
  id: number;
  data: string;
  status: StatusPedido;
  statusPagamento: StatusPagamento;
  tipoEntrega: TipoEntrega;
  total: number;
  quantidadeItens: number;
  imagens: string[];
}

export interface EnderecoEntregaInput {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  referencia?: string;
}

// POST /pedidos (preço, nome e pontos sempre vêm do banco)
export interface NovoPedido {
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  itens: { produtoId: number; quantidade: number }[];
  endereco?: EnderecoEntregaInput;
  observacao?: string;
  totalExibido?: number; // só para a API avisar se o preço mudou
}

// ---------------------------------------------------------------------------
// Fidelidade / Pontos
// ---------------------------------------------------------------------------

// GANHO = pedido concluído; ESTORNO = pedido concluído e depois cancelado; AJUSTE = saldo
// anterior ao extrato. RESGATE ainda não existe na API (fica "Em breve").
export type TipoMovimentoPontos = 'GANHO' | 'ESTORNO' | 'AJUSTE' | 'RESGATE';

export interface MovimentoPontos {
  id: number;
  data: string; // ISO
  tipo: TipoMovimentoPontos;
  pontos: number; // com sinal
  descricao: string;
  pedidoId?: number | null;
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
