import type {
  AuthResponse,
  Categoria,
  CategoriaInput,
  Endereco,
  EnderecoInput,
  LoginPayload,
  MovimentoPontos,
  Notificacao,
  Pedido,
  PerfilUpdatePayload,
  Produto,
  ProdutoInput,
  RegisterPayload,
  User,
} from '@/types';
import { db, nextId, persist } from './db';
import { MockUser } from './seed';

// Simula latência de rede.
const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

// Erro no formato aproximado do que o Axios entregaria (para o tratamento de erros
// no front-end funcionar igual com mock e com API real).
function apiError(status: number, message: string): never {
  const err = new Error(message) as Error & { response?: unknown };
  err.response = { status, data: { message } };
  throw err;
}

const stripSenha = (u: MockUser): User => {
  const { senha: _senha, ...rest } = u;
  return rest;
};

const fakeToken = (u: MockUser) =>
  `mock.jwt.${btoa(`${u.id}:${u.role}:${Date.now()}`)}`;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const mockApi = {
  async login({ email, senha }: LoginPayload): Promise<AuthResponse> {
    await delay();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.senha !== senha) {
      apiError(401, 'E-mail ou senha inválidos.');
    }
    return { token: fakeToken(user), refreshToken: fakeToken(user), user: stripSenha(user) };
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    await delay();
    if (db.users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
      apiError(409, 'Já existe uma conta com este e-mail.');
    }
    const user: MockUser = {
      id: nextId(),
      nome: payload.nome,
      email: payload.email,
      telefone: payload.telefone,
      senha: payload.senha,
      role: 'CLIENTE',
      saldoPontos: 0,
    };
    db.users.push(user);
    persist();
    return { token: fakeToken(user), refreshToken: fakeToken(user), user: stripSenha(user) };
  },

  async me(userId: number): Promise<User> {
    await delay(200);
    const user = db.users.find((u) => u.id === userId);
    if (!user) apiError(404, 'Usuário não encontrado.');
    return stripSenha(user);
  },

  async updatePerfil(userId: number, payload: PerfilUpdatePayload): Promise<User> {
    await delay();
    const user = db.users.find((u) => u.id === userId);
    if (!user) apiError(404, 'Usuário não encontrado.');
    if (
      db.users.some(
        (u) => u.id !== userId && u.email.toLowerCase() === payload.email.toLowerCase(),
      )
    ) {
      apiError(409, 'Este e-mail já está em uso por outra conta.');
    }
    user.nome = payload.nome;
    user.email = payload.email;
    user.telefone = payload.telefone;
    if (payload.senha) user.senha = payload.senha;
    persist();
    return stripSenha(user);
  },

  // -------------------------------------------------------------------------
  // Categorias
  // -------------------------------------------------------------------------

  async listCategorias(): Promise<Categoria[]> {
    await delay(250);
    return structuredClone(db.categorias);
  },

  async createCategoria(input: CategoriaInput): Promise<Categoria> {
    await delay();
    const categoria: Categoria = { id: nextId(), ...input };
    db.categorias.push(categoria);
    persist();
    return categoria;
  },

  async updateCategoria(id: number, input: CategoriaInput): Promise<Categoria> {
    await delay();
    const cat = db.categorias.find((c) => c.id === id);
    if (!cat) apiError(404, 'Categoria não encontrada.');
    Object.assign(cat, input);
    // Propaga alteração para produtos que referenciam esta categoria.
    db.produtos.forEach((p) => {
      if (p.categoria.id === id) p.categoria = structuredClone(cat);
    });
    persist();
    return structuredClone(cat);
  },

  async deleteCategoria(id: number): Promise<void> {
    await delay();
    if (db.produtos.some((p) => p.categoria.id === id)) {
      apiError(409, 'Não é possível excluir: existem produtos nesta categoria.');
    }
    db.categorias = db.categorias.filter((c) => c.id !== id);
    persist();
  },

  // -------------------------------------------------------------------------
  // Produtos
  // -------------------------------------------------------------------------

  async listProdutos(): Promise<Produto[]> {
    await delay(300);
    return structuredClone(db.produtos);
  },

  async createProduto(input: ProdutoInput): Promise<Produto> {
    await delay();
    const categoria = db.categorias.find((c) => c.id === input.categoriaId);
    if (!categoria) apiError(400, 'Categoria inválida.');
    const now = new Date().toISOString();
    const { categoriaId: _c, ...rest } = input;
    const produto: Produto = {
      id: nextId(),
      ...rest,
      categoria: structuredClone(categoria),
      dataCadastro: now,
      dataAtualizacao: now,
    };
    db.produtos.push(produto);
    persist();
    return produto;
  },

  async updateProduto(id: number, input: ProdutoInput): Promise<Produto> {
    await delay();
    const produto = db.produtos.find((p) => p.id === id);
    if (!produto) apiError(404, 'Produto não encontrado.');
    const categoria = db.categorias.find((c) => c.id === input.categoriaId);
    if (!categoria) apiError(400, 'Categoria inválida.');
    const { categoriaId: _c, ...rest } = input;
    Object.assign(produto, rest, {
      categoria: structuredClone(categoria),
      dataAtualizacao: new Date().toISOString(),
    });
    persist();
    return structuredClone(produto);
  },

  async toggleProdutoAtivo(id: number): Promise<Produto> {
    await delay(200);
    const produto = db.produtos.find((p) => p.id === id);
    if (!produto) apiError(404, 'Produto não encontrado.');
    produto.ativo = !produto.ativo;
    produto.dataAtualizacao = new Date().toISOString();
    persist();
    return structuredClone(produto);
  },

  async deleteProduto(id: number): Promise<void> {
    await delay();
    db.produtos = db.produtos.filter((p) => p.id !== id);
    persist();
  },

  // -------------------------------------------------------------------------
  // Endereços
  // -------------------------------------------------------------------------

  async listEnderecos(): Promise<Endereco[]> {
    await delay(200);
    return structuredClone(db.enderecos);
  },

  async createEndereco(input: EnderecoInput): Promise<Endereco> {
    await delay();
    const endereco: Endereco = { id: nextId(), ...input };
    if (endereco.padrao) db.enderecos.forEach((e) => (e.padrao = false));
    if (db.enderecos.length === 0) endereco.padrao = true;
    db.enderecos.push(endereco);
    persist();
    return endereco;
  },

  async updateEndereco(id: number, input: EnderecoInput): Promise<Endereco> {
    await delay();
    const endereco = db.enderecos.find((e) => e.id === id);
    if (!endereco) apiError(404, 'Endereço não encontrado.');
    if (input.padrao) db.enderecos.forEach((e) => (e.padrao = false));
    Object.assign(endereco, input);
    persist();
    return structuredClone(endereco);
  },

  async setEnderecoPadrao(id: number): Promise<Endereco[]> {
    await delay(200);
    db.enderecos.forEach((e) => (e.padrao = e.id === id));
    persist();
    return structuredClone(db.enderecos);
  },

  async deleteEndereco(id: number): Promise<void> {
    await delay();
    const removed = db.enderecos.find((e) => e.id === id);
    db.enderecos = db.enderecos.filter((e) => e.id !== id);
    // Se removeu o padrão, elege o primeiro restante.
    if (removed?.padrao && db.enderecos.length > 0) db.enderecos[0].padrao = true;
    persist();
  },

  // -------------------------------------------------------------------------
  // Pedidos
  // -------------------------------------------------------------------------

  async listPedidos(): Promise<Pedido[]> {
    await delay(300);
    return structuredClone(db.pedidos).sort((a, b) => b.data.localeCompare(a.data));
  },

  async getPedido(id: number): Promise<Pedido> {
    await delay(200);
    const pedido = db.pedidos.find((p) => p.id === id);
    if (!pedido) apiError(404, 'Pedido não encontrado.');
    return structuredClone(pedido);
  },

  // -------------------------------------------------------------------------
  // Pontos / Fidelidade
  // -------------------------------------------------------------------------

  async getSaldoPontos(userId: number): Promise<number> {
    await delay(150);
    const user = db.users.find((u) => u.id === userId);
    return user?.saldoPontos ?? 0;
  },

  async listMovimentosPontos(): Promise<MovimentoPontos[]> {
    await delay(250);
    return structuredClone(db.movimentos).sort((a, b) => b.data.localeCompare(a.data));
  },

  async resgatarProduto(userId: number, produtoId: number): Promise<MovimentoPontos> {
    await delay();
    const user = db.users.find((u) => u.id === userId);
    const produto = db.produtos.find((p) => p.id === produtoId);
    if (!user) apiError(404, 'Usuário não encontrado.');
    if (!produto) apiError(404, 'Produto não encontrado.');
    if (user.saldoPontos < produto.precoEmPontos) {
      apiError(400, 'Pontos insuficientes para este resgate.');
    }
    user.saldoPontos -= produto.precoEmPontos;
    const movimento: MovimentoPontos = {
      id: nextId(),
      data: new Date().toISOString(),
      tipo: 'RESGATE',
      pontos: -produto.precoEmPontos,
      descricao: `Resgate: ${produto.descricao}`,
    };
    db.movimentos.push(movimento);
    persist();
    return movimento;
  },

  // -------------------------------------------------------------------------
  // Notificações
  // -------------------------------------------------------------------------

  async listNotificacoes(): Promise<Notificacao[]> {
    await delay(200);
    return structuredClone(db.notificacoes).sort((a, b) => b.data.localeCompare(a.data));
  },

  async markNotificacaoLida(id: number): Promise<void> {
    await delay(120);
    const n = db.notificacoes.find((x) => x.id === id);
    if (n) n.lida = true;
    persist();
  },

  async markTodasLidas(): Promise<void> {
    await delay(150);
    db.notificacoes.forEach((n) => (n.lida = true));
    persist();
  },
};
