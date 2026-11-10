import type {
  AuthResponse,
  Categoria,
  CategoriaInput,
  Endereco,
  EnderecoInput,
  Cardapio,
  ItemRecusado,
  Loja,
  LojaConfig,
  LojaConfigInput,
  LoginPayload,
  MovimentoPontos,
  Notificacao,
  NovoPedido,
  Pedido,
  PedidoAdmin,
  PedidoResumo,
  PerfilUpdatePayload,
  PreviaPedido,
  PreviaPedidoInput,
  Produto,
  ProdutoInput,
  RegisterPayload,
  ResumoDia,
  StatusPagamento,
  StatusPedido,
  User,
} from '@/types';
import { MOCK } from '@/config/mock';
import { db, nextId, persist } from './db';
import { MockUser, seedLoja } from './seed';
import { pixExpirado } from '@/lib/statusPedido';

// Simula latência de rede.
const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

// Erro no formato aproximado do que o Axios entregaria (para o tratamento de erros
// no front-end funcionar igual com mock e com API real).
function apiError(status: number, message: string, codigo?: string): never {
  const err = new Error(message) as Error & { response?: unknown };
  err.response = { status, data: { message, codigo } };
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

function cancelar(pedido: Pedido, por: 'CLIENTE' | 'LOJA' | 'SISTEMA', motivo: string, em: string) {
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

// --- Loja e painel (versão simplificada das regras da API) ---------------------------------

// Configuração da loja: a salva pelo painel ou a de exemplo (com um Pix de mentira).
const lojaConfig = (): LojaConfigInput =>
  db.lojaConfig ?? {
    nome: seedLoja.nome,
    cidade: seedLoja.cidade ?? 'Taquaritinga',
    pixChave: 'demonstracao@cremoso.com',
    pixNomeRecebedor: 'CREMOSO SORVETES',
    pixCidade: 'TAQUARITINGA',
    whatsapp: seedLoja.whatsapp,
    entregaAtiva: seedLoja.entregaAtiva,
    taxaEntrega: seedLoja.taxaEntrega,
    pedidoMinimo: seedLoja.pedidoMinimo,
    horarios: seedLoja.horarios,
  };

const pixConfigurado = (c: LojaConfigInput) => !!(c.pixChave && c.pixNomeRecebedor && c.pixCidade);

const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  RECEBIDO: ['ACEITO', 'CANCELADO'],
  ACEITO: ['EM_PREPARO', 'CANCELADO'],
  EM_PREPARO: ['PRONTO', 'SAIU_PARA_ENTREGA', 'CANCELADO'],
  PRONTO: ['CONCLUIDO', 'CANCELADO'],
  SAIU_PARA_ENTREGA: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: ['CANCELADO'],
  CANCELADO: [],
};
const ATIVOS: StatusPedido[] = ['RECEBIDO', 'ACEITO', 'EM_PREPARO', 'PRONTO', 'SAIU_PARA_ENTREGA'];
const JANELA_PIX_TARDIO_MS = 2 * 60 * 60_000;
const diaLocal = (iso: string) => new Date(iso).toLocaleDateString('en-CA');

// Campos calculados do painel (prazo do Pix vencido e aviso), como a API devolve.
function paraPainel(p: PedidoAdmin): PedidoAdmin {
  const prazo =
    pixExpirado(p) && p.statusPagamento === 'PENDENTE' && p.pixExpiraEm
      ? new Date(Date.parse(p.pixExpiraEm) + JANELA_PIX_TARDIO_MS).toISOString()
      : null;
  let aviso: string | null = null;
  if (p.status === 'CANCELADO' && p.statusPagamento === 'CONFIRMADO') {
    aviso = 'Pagamento confirmado: devolva o valor ao cliente e marque como DEVOLVIDO.';
  } else if (prazo) {
    aviso = 'Pix vencido: se o cliente pagou, confirme o pagamento para retomar o pedido.';
  }
  return structuredClone({ ...p, confirmarPagamentoAte: prazo, aviso });
}

function pedidoDoPainel(id: number): PedidoAdmin {
  const pedido = db.pedidos.find((p) => p.id === id);
  if (!pedido) apiError(404, 'Pedido não encontrado.');
  expirarPix(pedido);
  return pedido;
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

  async marcarEsgotado(id: number, esgotado: boolean): Promise<Produto> {
    await delay(200);
    const produto = db.produtos.find((p) => p.id === id);
    if (!produto) apiError(404, 'Produto não encontrado.');
    produto.esgotado = esgotado;
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

    const loja = lojaConfig();
    const itens = novo.itens.map(({ produtoId, quantidade, observacao }) => {
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
        observacao: observacao?.trim() || null,
      };
    });
    const subtotal = centavos(itens.reduce((s, i) => s + i.subtotal, 0));
    const entrega = novo.tipoEntrega === 'ENTREGA';
    if (entrega && loja.pedidoMinimo !== null && subtotal < loja.pedidoMinimo) {
      apiError(409, 'O pedido mínimo para entrega não foi atingido.');
    }
    const frete = entrega ? loja.taxaEntrega : 0;
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + 15 * 60_000).toISOString();
    const pedido: PedidoAdmin = {
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
        expiraEm,
      },
      endereco:
        entrega && novo.endereco
          ? {
              cep: novo.endereco.cep,
              rua: novo.endereco.rua,
              numero: novo.endereco.numero,
              complemento: novo.endereco.complemento ?? null,
              bairro: novo.endereco.bairro,
              cidade: loja.cidade,
              referencia: novo.endereco.referencia ?? null,
            }
          : null,
      observacao: novo.observacao ?? null,
      podeCancelar: true,
      motivoCancelamento: null,
      canceladoPor: null,
      historico: [{ status: 'RECEBIDO', em: agora.toISOString() }],
      cliente: { id: 1, nome: 'Ana Cliente', telefone: '(11) 98888-1111' },
      pixExpiraEm: expiraEm,
      pagamentoConfirmadoEm: null,
      confirmarPagamentoAte: null,
      aviso: null,
    };
    db.pedidos.push(pedido);
    db.chavesPedido[chave] = pedido.id;
    persist();
    return structuredClone(pedido);
  },

  async previaPedido(input: PreviaPedidoInput): Promise<PreviaPedido> {
    await delay(200);
    const loja = lojaConfig();
    const entrega = input.tipoEntrega === 'ENTREGA';
    const recusados: ItemRecusado[] = [];
    const itens: PreviaPedido['itens'] = [];
    for (const { produtoId, quantidade, observacao, precoExibido } of input.itens) {
      const produto = db.produtos.find((p) => p.id === produtoId);
      const motivo = !produto
        ? 'NAO_ENCONTRADO'
        : !produto.ativo
          ? 'INATIVO'
          : produto.esgotado || produto.quantidade <= 0
            ? 'ESGOTADO'
            : null;
      if (motivo || !produto) {
        recusados.push({
          produtoId,
          descricao: produto?.descricao ?? null,
          motivo: motivo ?? 'NAO_ENCONTRADO',
          precoExibido: precoExibido ?? null,
          precoAtual: null,
        });
        continue;
      }
      if (precoExibido !== undefined && centavos(precoExibido) !== centavos(produto.preco)) {
        recusados.push({
          produtoId,
          descricao: produto.descricao,
          motivo: 'PRECO_MUDOU',
          precoExibido,
          precoAtual: produto.preco,
        });
      }
      itens.push({
        produtoId,
        descricao: produto.descricao,
        quantidade,
        valorUnitario: produto.preco,
        subtotal: centavos(produto.preco * quantidade),
        pontos: (produto.ganhoDePontos ?? 0) * quantidade,
        observacao: observacao?.trim() || null,
      });
    }
    const subtotal = centavos(itens.reduce((s, i) => s + i.subtotal, 0));
    const frete = entrega ? loja.taxaEntrega : 0;
    const falta = entrega && loja.pedidoMinimo !== null ? Math.max(0, centavos(loja.pedidoMinimo - subtotal)) : 0;
    const aberta = pixConfigurado(loja);
    return {
      tipoEntrega: input.tipoEntrega,
      itens,
      recusados,
      subtotal,
      frete,
      total: centavos(subtotal + frete),
      pontos: itens.reduce((s, i) => s + i.pontos, 0),
      pedidoMinimo: loja.pedidoMinimo,
      atingeMinimo: falta === 0,
      faltaParaMinimo: falta,
      lojaAberta: aberta,
      motivoFechada: aberta ? null : 'PAGAMENTO_NAO_CONFIGURADO',
      podeFinalizar: aberta && itens.length > 0 && recusados.length === 0 && falta === 0,
    };
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

  // Sempre dentro do horário no modo demonstração; fechada só sem Pix configurado.
  async getLoja(): Promise<Loja> {
    await delay(150);
    const c = lojaConfig();
    const aberta = pixConfigurado(c);
    return structuredClone({
      ...seedLoja,
      nome: c.nome,
      cidade: c.cidade,
      aberta,
      motivoFechada: aberta ? null : 'PAGAMENTO_NAO_CONFIGURADO',
      horarios: c.horarios,
      entregaAtiva: c.entregaAtiva,
      taxaEntrega: c.taxaEntrega,
      pedidoMinimo: c.pedidoMinimo,
      formasPagamento: aberta ? ['PIX'] : [],
      whatsapp: c.whatsapp,
    });
  },

  async adminGetLoja(): Promise<LojaConfig> {
    await delay(200);
    const c = lojaConfig();
    return structuredClone({
      ...c,
      pausada: false,
      pixExemplo: pixConfigurado(c) ? 'MODO-DEMONSTRACAO-PIX-DE-TESTE-SEM-VALOR' : null,
    });
  },

  async adminSalvarLoja(input: LojaConfigInput): Promise<LojaConfig> {
    await delay();
    if (!input.nome.trim()) apiError(400, 'Nome da loja é obrigatório.');
    if (!input.cidade.trim()) apiError(400, 'Cidade da loja é obrigatória (a entrega só atende esta cidade).');
    db.lojaConfig = structuredClone(input);
    persist();
    return mockApi.adminGetLoja();
  },

  // -------------------------------------------------------------------------
  // Painel: pedidos
  // -------------------------------------------------------------------------

  async adminListPedidos(filtro: { status?: StatusPedido[]; data?: string }): Promise<PedidoAdmin[]> {
    await delay(250);
    db.pedidos.forEach(expirarPix);
    const hoje = diaLocal(new Date().toISOString());
    return db.pedidos
      .filter((p) => {
        // Igual à API: sem status, só os ativos; sem data, os finalizados só de hoje.
        const status = filtro.status?.length ? filtro.status : ATIVOS;
        if (!status.includes(p.status)) return false;
        if (filtro.data) return diaLocal(p.data) === filtro.data;
        return ATIVOS.includes(p.status) || diaLocal(p.data) === hoje;
      })
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(paraPainel);
  },

  async adminGetPedido(id: number): Promise<PedidoAdmin> {
    await delay(150);
    return paraPainel(pedidoDoPainel(id));
  },

  async adminMudarStatus(
    id: number,
    statusAtual: StatusPedido,
    para: StatusPedido,
    motivo?: string,
  ): Promise<PedidoAdmin> {
    await delay();
    const p = pedidoDoPainel(id);
    if (p.status !== statusAtual) {
      apiError(409, `O pedido #${id} já mudou de status. Atualize a tela.`, 'STATUS_DESATUALIZADO');
    }
    if (!TRANSICOES[p.status].includes(para)) apiError(409, 'Mudança de status não permitida.', 'TRANSICAO_INVALIDA');
    if (para === 'PRONTO' && p.tipoEntrega !== 'RETIRADA') apiError(409, 'Pedido de entrega: use Saiu para entrega.');
    if (para === 'SAIU_PARA_ENTREGA' && p.tipoEntrega !== 'ENTREGA') apiError(409, 'Pedido de retirada: use Pronto.');
    if ((para === 'EM_PREPARO' || para === 'CONCLUIDO') && p.statusPagamento !== 'CONFIRMADO') {
      apiError(409, 'Confirme o pagamento do Pix antes de iniciar o preparo.', 'PAGAMENTO_PENDENTE');
    }
    const agora = new Date().toISOString();
    if (para === 'CANCELADO') {
      if (!motivo?.trim()) apiError(400, 'Motivo do cancelamento é obrigatório.');
      cancelar(p, 'LOJA', motivo.trim(), agora);
    } else {
      p.status = para;
      p.podeCancelar = para === 'RECEBIDO' || para === 'ACEITO';
      if (para === 'CONCLUIDO') p.pontosCreditados = true;
      p.historico.push({ status: para, em: agora });
    }
    persist();
    return paraPainel(p);
  },

  async adminPagamento(id: number, status: StatusPagamento): Promise<PedidoAdmin> {
    await delay();
    const p = pedidoDoPainel(id);
    if (p.statusPagamento === status) return paraPainel(p);
    const agora = new Date().toISOString();
    if (status === 'CONFIRMADO') {
      if (p.statusPagamento === 'DEVOLVIDO') apiError(409, 'Este pagamento já foi devolvido.');
      const prazo = paraPainel(p).confirmarPagamentoAte;
      if (pixExpirado(p)) {
        if (!prazo || Date.now() >= Date.parse(prazo)) {
          apiError(409, 'O prazo de 2 horas para confirmar o pagamento acabou.', 'PEDIDO_EXPIRADO');
        }
        // Pix pago no limite: o pedido volta ao status de antes do cancelamento.
        const volta = p.historico[p.historico.length - 2]?.status ?? 'RECEBIDO';
        p.status = volta;
        p.canceladoPor = null;
        p.motivoCancelamento = null;
        p.podeCancelar = true;
        p.historico.push({ status: volta, em: agora });
      } else if (p.status === 'CANCELADO') {
        apiError(409, 'O pedido está cancelado: não é possível confirmar o pagamento.');
      }
      p.pix = null;
      p.pagamentoConfirmadoEm = agora;
    } else if (status === 'DEVOLVIDO') {
      if (p.status !== 'CANCELADO') apiError(409, 'Só dá para devolver o pagamento de um pedido cancelado.');
    } else {
      apiError(409, 'Desfazer a confirmação não existe no modo demonstração.');
    }
    p.statusPagamento = status;
    persist();
    return paraPainel(p);
  },

  async adminResumo(): Promise<ResumoDia> {
    await delay(200);
    const hoje = diaLocal(new Date().toISOString());
    const doDia = db.pedidos.filter((p) => diaLocal(p.data) === hoje);
    const validos = doDia.filter((p) => p.status !== 'CANCELADO');
    return {
      data: hoje,
      pedidos: validos.length,
      concluidos: doDia.filter((p) => p.status === 'CONCLUIDO').length,
      cancelados: doDia.length - validos.length,
      totalConfirmado: centavos(
        validos.filter((p) => p.statusPagamento === 'CONFIRMADO').reduce((s, p) => s + p.total, 0),
      ),
      pixPendentes: doDia.filter((p) => ATIVOS.includes(p.status) && p.statusPagamento === 'PENDENTE').length,
    };
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
