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
  // "Li e aceito a política de privacidade e as regras dos pontos" + versão do texto.
  aceiteTermos: boolean;
  versaoTermos: string;
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
  pausadaAte?: string | null; // "Pausar pedidos" por tempo: quando volta (ISO)
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
  observacao: string | null; // do item ("sem calda"), até 140 caracteres
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

export interface ItemNovoPedido {
  produtoId: number;
  quantidade: number;
  observacao?: string; // até 140 caracteres
}

// POST /pedidos (preço, nome e pontos sempre vêm do banco)
export interface NovoPedido {
  tipoEntrega: TipoEntrega;
  formaPagamento: FormaPagamento;
  itens: ItemNovoPedido[];
  endereco?: EnderecoEntregaInput;
  observacao?: string; // observação geral, até 500
  totalExibido?: number; // só para a API avisar se o preço mudou
}

// POST /pedidos/previa: o que o pedido custaria agora (não grava nada).
export interface PreviaPedidoInput {
  tipoEntrega: TipoEntrega;
  itens: (ItemNovoPedido & { precoExibido?: number })[];
  cep?: string; // opcional; se vier, 8 dígitos
}

export type MotivoRecusa = 'ESGOTADO' | 'INATIVO' | 'NAO_ENCONTRADO' | 'PRECO_MUDOU';

export interface ItemRecusado {
  produtoId: number;
  descricao: string | null;
  motivo: MotivoRecusa; // PRECO_MUDOU entra no total pelo preço novo; os outros ficam fora
  precoExibido: number | null;
  precoAtual: number | null;
}

export interface PreviaPedido {
  tipoEntrega: TipoEntrega;
  itens: Omit<ItemPedido, 'imagemUrl'>[];
  recusados: ItemRecusado[];
  subtotal: number;
  frete: number;
  total: number;
  pontos: number;
  pedidoMinimo: number | null;
  atingeMinimo: boolean;
  faltaParaMinimo: number;
  lojaAberta: boolean;
  motivoFechada: MotivoLojaFechada | null;
  podeFinalizar: boolean;
}

// ---------------------------------------------------------------------------
// Painel da loja (ADMIN)
// ---------------------------------------------------------------------------

// GET /admin/pedidos e /admin/pedidos/{id}
export interface PedidoAdmin extends Pedido {
  cliente: { id: number; nome: string; telefone: string };
  pixExpiraEm: string | null;
  pagamentoConfirmadoEm: string | null;
  // Pix vencido: até quando ainda dá para confirmar o pagamento e retomar o pedido.
  confirmarPagamentoAte: string | null;
  aviso: string | null;
}

// GET /admin/pedidos/resumo
export interface ResumoDia {
  data: string; // AAAA-MM-DD
  pedidos: number; // não cancelados
  concluidos: number;
  cancelados: number;
  totalConfirmado: number; // só pagamentos confirmados
  pixPendentes: number;
}

// GET/PUT /admin/loja
export interface LojaConfigInput {
  nome: string;
  cidade: string;
  pixChave: string | null;
  pixNomeRecebedor: string | null;
  pixCidade: string | null;
  whatsapp: string | null;
  entregaAtiva: boolean;
  taxaEntrega: number;
  pedidoMinimo: number | null;
  horarios: HorarioLoja[];
}

export interface LojaConfig extends LojaConfigInput {
  pausada: boolean; // "Pausar pedidos" valendo agora
  pausadaAte: string | null; // fim da pausa por tempo; null = até reabrir
  pixExemplo: string | null; // Pix de R$ 0,01 para testar a chave no app do banco
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
