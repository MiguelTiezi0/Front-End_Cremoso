import type {
  AuthResponse,
  Categoria,
  CategoriaInput,
  Endereco,
  EnderecoInput,
  Cardapio,
  Loja,
  LoginPayload,
  MovimentoPontos,
  Notificacao,
  NovoPedido,
  Pedido,
  PedidoResumo,
  PerfilUpdatePayload,
  Produto,
  ProdutoInput,
  RegisterPayload,
  User,
} from '@/types';
import { MOCK } from '@/config/mock';
import { db, nextId, persist } from './db';
import { MockUser, seedLoja } from './seed';

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

// Conta do mock correspondente ao usuário logado. Só existe quando o próprio login é do
// mock (MOCK.auth); no modo misto o usuário vem da API real e pode ter o mesmo id/e-mail
// de uma conta de exemplo sem ser ela.
const usuarioDoMock = (user: User): MockUser | undefined =>
  MOCK.auth ? db.users.find((u) => u.id === user.id) : undefined;

// Extrato de pontos do usuário logado: o de exemplo para contas do mock, um por usuário
// (começando vazio) para contas reais.
function movimentosDe(user: User): MovimentoPontos[] {
  if (usuarioDoMock(user)) return db.movimentos;
  db.movimentosPorUsuario ??= {};
  return (db.movimentosPorUsuario[String(user.id)] ??= []);
}

const centavos = (v: number) => Math.round(v * 100) / 100;

function cancelar(pedido: Pedido, por: 'CLIENTE' | 'SISTEMA', motivo: string, em: string) {
  pedido.status = 'CANCELADO';
  pedido.canceladoPor = por;
  pedido.motivoCancelamento = motivo;
  pedido.podeCancelar = false;
  pedido.pix = null;
  pedido.historico.push({ status: 'CANCELADO', em });
}

// Igual à API: Pix não pago em 15 minutos cancela o pedido (na próxima leitura).
function expirarPix(pedido: Pedido) {
  const expira = pedido.pix?.expiraEm;
  if (pedido.statusPagamento !== 'PENDENTE' || !expira || Date.now() < Date.parse(expira)) return;
  if (pedido.status !== 'RECEBIDO' && pedido.status !== 'ACEITO') return;
  cancelar(pedido, 'SISTEMA', 'PIX_EXPIRADO', expira);
  persist();
}

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

  async listPedidos(): Promise<PedidoResumo[]> {
    await delay(300);
    db.pedidos.forEach(expirarPix);
    return structuredClone(db.pedidos)
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((p) => ({
        id: p.id,
        data: p.data,
        status: p.status,
        statusPagamento: p.statusPagamento,
        tipoEntrega: p.tipoEntrega,
        total: p.total,
        quantidadeItens: p.itens.reduce((s, i) => s + i.quantidade, 0),
        imagens: p.itens.map((i) => i.imagemUrl).filter((u): u is string => !!u).slice(0, 3),
      }));
  },

  async getPedido(id: number): Promise<Pedido> {
    await delay(200);
    const pedido = db.pedidos.find((p) => p.id === id);
    if (!pedido) apiError(404, 'Pedido não encontrado.');
    expirarPix(pedido);
    return structuredClone(pedido);
  },

  // Versão simplificada da API: recalcula preços, recusa esgotado e aplica o mínimo.
  async criarPedido(novo: NovoPedido, chave: string): Promise<Pedido> {
    await delay();
    db.chavesPedido ??= {};
    const repetido = db.pedidos.find((p) => p.id === db.chavesPedido?.[chave]);
    if (repetido) return structuredClone(repetido);

    const itens = novo.itens.map(({ produtoId, quantidade }) => {
      const produto = db.produtos.find((p) => p.id === produtoId && p.ativo);
      if (!produto || produto.quantidade <= 0 || produto.esgotado) {
        apiError(409, 'Um produto do carrinho não está mais disponível.');
      }
      const pontos = (produto.ganhoDePontos ?? 0) * quantidade;
      return {
        produtoId,
        descricao: produto.descricao,
        imagemUrl: produto.imagemUrl,
        quantidade,
        valorUnitario: produto.preco,
        subtotal: centavos(produto.preco * quantidade),
        pontos,
      };
    });
    const subtotal = centavos(itens.reduce((s, i) => s + i.subtotal, 0));
    const entrega = novo.tipoEntrega === 'ENTREGA';
    if (entrega && seedLoja.pedidoMinimo !== null && subtotal < seedLoja.pedidoMinimo) {
      apiError(409, 'O pedido mínimo para entrega não foi atingido.');
    }
    const frete = entrega ? seedLoja.taxaEntrega : 0;
    const agora = new Date();
    const pedido: Pedido = {
      id: nextId(),
      data: agora.toISOString(),
      status: 'RECEBIDO',
      statusPagamento: 'PENDENTE',
      tipoEntrega: novo.tipoEntrega,
      formaPagamento: 'PIX',
      itens,
      subtotal,
      frete,
      total: centavos(subtotal + frete),
      pontosGanhos: itens.reduce((s, i) => s + i.pontos, 0),
      pontosCreditados: false,
      pix: {
        // Código de mentira: o modo demonstração não gera Pix de verdade.
        copiaECola: `00020126580014BR.GOV.BCB.PIX0136MODO-DEMONSTRACAO-SEM-VALOR5204000053039865802BR5907CREMOSO6012TAQUARITINGA6304ABCD`,
        valor: centavos(subtotal + frete),
        expiraEm: new Date(agora.getTime() + 15 * 60_000).toISOString(),
      },
      endereco:
        entrega && novo.endereco
          ? {
              cep: novo.endereco.cep,
              rua: novo.endereco.rua,
              numero: novo.endereco.numero,
              complemento: novo.endereco.complemento ?? null,
              bairro: novo.endereco.bairro,
              cidade: seedLoja.cidade ?? '',
              referencia: novo.endereco.referencia ?? null,
            }
          : null,
      observacao: novo.observacao ?? null,
      podeCancelar: true,
      motivoCancelamento: null,
      canceladoPor: null,
      historico: [{ status: 'RECEBIDO', em: agora.toISOString() }],
    };
    db.pedidos.push(pedido);
    db.chavesPedido[chave] = pedido.id;
    persist();
    return structuredClone(pedido);
  },

  async cancelarPedido(id: number): Promise<Pedido> {
    await delay();
    const pedido = db.pedidos.find((p) => p.id === id);
    if (!pedido) apiError(404, 'Pedido não encontrado.');
    expirarPix(pedido);
    if (pedido.status !== 'CANCELADO') {
      if (!pedido.podeCancelar) apiError(409, 'Este pedido não pode mais ser cancelado.');
      cancelar(pedido, 'CLIENTE', 'Cancelado pelo cliente.', new Date().toISOString());
      persist();
    }
    return structuredClone(pedido);
  },

  // -------------------------------------------------------------------------
  // Loja e cardápio
  // -------------------------------------------------------------------------

  async getLoja(): Promise<Loja> {
    await delay(150);
    return structuredClone(seedLoja);
  },

  async getCardapio(): Promise<Cardapio> {
    await delay(250);
    const categorias = db.categorias
      .filter((c) => c.ativa)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao,
        imagemUrl: c.imagemUrl,
        produtos: db.produtos
          .filter((p) => p.ativo && p.categoria.id === c.id)
          .map((p) => ({
            id: p.id,
            descricao: p.descricao,
            preco: p.preco,
            imagemUrl: p.imagemUrl,
            ganhoDePontos: p.ganhoDePontos,
            esgotado: p.esgotado ?? p.quantidade <= 0,
          })),
      }))
      .filter((c) => c.produtos.length > 0);
    return structuredClone({ categorias });
  },

  // -------------------------------------------------------------------------
  // Pontos / Fidelidade
  // -------------------------------------------------------------------------

  // Usam o usuário logado (AuthContext) e o produto recebidos, não buscas por id no banco
  // do mock: assim funcionam também no modo misto (login e catálogo pela API real).

  async getSaldoPontos(user: User): Promise<number> {
    await delay(150);
    return usuarioDoMock(user)?.saldoPontos ?? user.saldoPontos;
  },

  async listMovimentosPontos(user: User): Promise<MovimentoPontos[]> {
    await delay(250);
    return structuredClone(movimentosDe(user)).sort((a, b) => b.data.localeCompare(a.data));
  },

  async resgatarProduto(user: User, produto: Produto): Promise<MovimentoPontos> {
    await delay();
    const custo = produto.precoEmPontos;
    if (custo === null || custo <= 0) apiError(400, 'Produto não disponível para resgate.');
    const doMock = usuarioDoMock(user);
    if ((doMock?.saldoPontos ?? user.saldoPontos) < custo) {
      apiError(400, 'Pontos insuficientes para este resgate.');
    }
    // O saldo exibido vem do AuthContext (o PontosPage atualiza); no mock puro também
    // atualizamos a conta do mock para o próximo login.
    if (doMock) doMock.saldoPontos -= custo;
    const movimento: MovimentoPontos = {
      id: nextId(),
      data: new Date().toISOString(),
      tipo: 'RESGATE',
      pontos: -custo,
      descricao: `Resgate: ${produto.descricao}`,
    };
    movimentosDe(user).push(movimento);
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
