import type {
  Categoria,
  Endereco,
  Loja,
  MovimentoPontos,
  Notificacao,
  Pedido,
  Produto,
  User,
} from '@/types';

// Usuário de mock com senha (a senha só existe no mock; a API real nunca a devolve).
export interface MockUser extends User {
  senha: string;
}

const now = new Date();
const iso = (daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

export const seedUsers: MockUser[] = [
  {
    id: 1,
    nome: 'Ana Cliente',
    email: 'cliente@cremoso.com',
    telefone: '(11) 98888-1111',
    senha: 'Senha@123',
    role: 'CLIENTE',
    saldoPontos: 320,
  },
  {
    id: 2,
    nome: 'Bruno Admin',
    email: 'admin@cremoso.com',
    telefone: '(11) 97777-2222',
    senha: 'Admin@123',
    role: 'ADMIN',
    saldoPontos: 0,
  },
];

export const seedCategorias: Categoria[] = [
  {
    id: 1,
    nome: 'Sorvetes de Massa',
    descricao: 'Cremosos, servidos em bolas ou potes.',
    imagemUrl:
      'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400&q=60',
    ativa: true,
  },
  {
    id: 2,
    nome: 'Picolés',
    descricao: 'Refrescantes, de fruta ou ao leite.',
    imagemUrl:
      'https://images.unsplash.com/photo-1488900128323-21503983a07e?auto=format&fit=crop&w=400&q=60',
    ativa: true,
  },
  {
    id: 3,
    nome: 'Milkshakes',
    descricao: 'Batidos cremosos com coberturas.',
    imagemUrl:
      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=60',
    ativa: true,
  },
  {
    id: 4,
    nome: 'Açaí',
    descricao: 'Na tigela, com acompanhamentos.',
    imagemUrl:
      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=400&q=60',
    ativa: false,
  },
];

export const seedProdutos: Produto[] = [
  {
    id: 1,
    descricao: 'Sorvete de Morango (500ml)',
    quantidade: 40,
    preco: 24.9,
    ativo: true,
    categoria: seedCategorias[0],
    imagemUrl:
      'https://images.unsplash.com/photo-1633933358116-a27b902fad35?auto=format&fit=crop&w=400&q=60',
    precoEmPontos: 250,
    ganhoDePontos: 25,
    dataCadastro: iso(30),
    dataAtualizacao: iso(2),
  },
  {
    id: 2,
    descricao: 'Sorvete de Chocolate Belga (500ml)',
    quantidade: 25,
    preco: 29.9,
    ativo: true,
    categoria: seedCategorias[0],
    imagemUrl:
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&q=60',
    precoEmPontos: 300,
    ganhoDePontos: 30,
    dataCadastro: iso(28),
    dataAtualizacao: iso(1),
  },
  {
    id: 3,
    descricao: 'Picolé de Limão',
    quantidade: 120,
    preco: 7.5,
    ativo: true,
    categoria: seedCategorias[1],
    imagemUrl:
      'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=400&q=60',
    precoEmPontos: 80,
    ganhoDePontos: 8,
    dataCadastro: iso(20),
    dataAtualizacao: iso(20),
  },
  {
    id: 4,
    descricao: 'Milkshake de Baunilha (400ml)',
    quantidade: 0,
    preco: 18.0,
    ativo: true,
    categoria: seedCategorias[2],
    imagemUrl:
      'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=400&q=60',
    precoEmPontos: 180,
    ganhoDePontos: 18,
    dataCadastro: iso(15),
    dataAtualizacao: iso(3),
  },
  {
    id: 5,
    descricao: 'Sorvete de Pistache (500ml)',
    quantidade: 12,
    preco: 34.9,
    ativo: false,
    categoria: seedCategorias[0],
    imagemUrl:
      'https://images.unsplash.com/photo-1567206563064-6f60f1a2a2e0?auto=format&fit=crop&w=400&q=60',
    precoEmPontos: 350,
    ganhoDePontos: 35,
    dataCadastro: iso(10),
    dataAtualizacao: iso(5),
  },
];

export const seedEnderecos: Endereco[] = [
  {
    id: 1,
    rua: 'Rua das Flores',
    numero: '123',
    complemento: 'Apto 45',
    bairro: 'Jardim Primavera',
    cidade: 'São Paulo',
    cep: '01234-567',
    pontoReferencia: 'Próximo à padaria',
    padrao: true,
  },
];

// Pedidos de exemplo no formato da API (GET /pedidos/{id}).
export const seedPedidos: Pedido[] = [
  {
    id: 1001,
    data: iso(1),
    status: 'SAIU_PARA_ENTREGA',
    statusPagamento: 'CONFIRMADO',
    tipoEntrega: 'ENTREGA',
    formaPagamento: 'PIX',
    itens: [
      {
        produtoId: 1,
        descricao: 'Sorvete de Morango (500ml)',
        imagemUrl: seedProdutos[0].imagemUrl,
        quantidade: 2,
        valorUnitario: 24.9,
        subtotal: 49.8,
        pontos: 50,
      },
    ],
    subtotal: 49.8,
    frete: 8.0,
    total: 57.8,
    pontosGanhos: 50,
    pontosCreditados: false,
    pix: null,
    endereco: {
      cep: '15900-000',
      rua: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 45',
      bairro: 'Jardim Primavera',
      cidade: 'Taquaritinga',
      referencia: 'Próximo à padaria',
    },
    observacao: null,
    podeCancelar: false,
    motivoCancelamento: null,
    canceladoPor: null,
    historico: [
      { status: 'RECEBIDO', em: iso(1) },
      { status: 'ACEITO', em: iso(1) },
      { status: 'EM_PREPARO', em: iso(1) },
      { status: 'SAIU_PARA_ENTREGA', em: iso(1) },
    ],
  },
  {
    id: 1000,
    data: iso(7),
    status: 'CONCLUIDO',
    statusPagamento: 'CONFIRMADO',
    tipoEntrega: 'RETIRADA',
    formaPagamento: 'PIX',
    itens: [
      {
        produtoId: 3,
        descricao: 'Picolé de Limão',
        imagemUrl: seedProdutos[2].imagemUrl,
        quantidade: 4,
        valorUnitario: 7.5,
        subtotal: 30.0,
        pontos: 32,
      },
      {
        produtoId: 2,
        descricao: 'Sorvete de Chocolate Belga (500ml)',
        imagemUrl: seedProdutos[1].imagemUrl,
        quantidade: 1,
        valorUnitario: 29.9,
        subtotal: 29.9,
        pontos: 30,
      },
    ],
    subtotal: 59.9,
    frete: 0,
    total: 59.9,
    pontosGanhos: 62,
    pontosCreditados: true,
    pix: null,
    endereco: null,
    observacao: null,
    podeCancelar: false,
    motivoCancelamento: null,
    canceladoPor: null,
    historico: [
      { status: 'RECEBIDO', em: iso(7) },
      { status: 'ACEITO', em: iso(7) },
      { status: 'EM_PREPARO', em: iso(7) },
      { status: 'PRONTO', em: iso(7) },
      { status: 'CONCLUIDO', em: iso(7) },
    ],
  },
];

// Loja do modo demonstração: sempre aberta, com entrega.
export const seedLoja: Loja = {
  nome: 'Cremoso',
  cidade: 'Taquaritinga',
  aberta: true,
  motivoFechada: null,
  proximaAbertura: null,
  horarios: [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, abre: '10:00', fecha: '22:00' })),
  entregaAtiva: true,
  taxaEntrega: 8,
  pedidoMinimo: 15,
  formasPagamento: ['PIX'],
  whatsapp: '(16) 99999-0000',
};

export const seedMovimentos: MovimentoPontos[] = [
  { id: 1, data: iso(7), tipo: 'GANHO', pontos: 62, descricao: 'Pedido #1000', pedidoId: 1000 },
  { id: 2, data: iso(5), tipo: 'RESGATE', pontos: -80, descricao: 'Resgate: Picolé de Limão' },
  { id: 3, data: iso(1), tipo: 'GANHO', pontos: 50, descricao: 'Pedido #1001', pedidoId: 1001 },
];

export const seedNotificacoes: Notificacao[] = [
  {
    id: 1,
    tipo: 'PEDIDO',
    titulo: 'Seu pedido saiu para entrega! 🛵',
    mensagem: 'O pedido #1001 está a caminho. Prepare a colher!',
    data: iso(0),
    lida: false,
  },
  {
    id: 2,
    tipo: 'PONTOS',
    titulo: 'Você ganhou 50 pontos',
    mensagem: 'Pontos creditados pela compra do pedido #1001.',
    data: iso(1),
    lida: false,
  },
  {
    id: 3,
    tipo: 'PROMOCAO',
    titulo: 'Terça do Sorvete: 20% OFF',
    mensagem: 'Sorvetes de massa com desconto especial nesta terça!',
    data: iso(2),
    lida: true,
  },
];
