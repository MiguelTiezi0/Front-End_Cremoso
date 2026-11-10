import type { NovoPedido, ProdutoCardapio } from '@/types';

// Regras do carrinho (funções puras; o estado fica em src/context/CarrinhoContext.tsx).

// Limites da API (POST /pedidos).
export const MAX_QUANTIDADE = 50;
export const MAX_PRODUTOS_DIFERENTES = 30;
export const MAX_OBSERVACAO_PEDIDO = 500;
export const MAX_OBSERVACAO_ITEM = 120;

// O que o cliente viu ao adicionar. Preço e pontos são só para exibir: a API recalcula tudo.
export interface ItemCarrinho {
  produtoId: number;
  quantidade: number;
  observacao: string;
  descricao: string;
  preco: number;
  imagemUrl: string | null;
  ganhoDePontos: number | null;
}

export type TipoAviso = 'ESGOTADO' | 'INDISPONIVEL' | 'PRECO';

export interface AvisoCarrinho {
  produtoId: number;
  descricao: string;
  tipo: TipoAviso;
  precoAnterior?: number;
  precoAtual?: number;
}

export const centavos = (v: number) => Math.round(v * 100) / 100;

export const subtotalDe = (itens: ItemCarrinho[]) =>
  centavos(itens.reduce((s, i) => s + i.preco * i.quantidade, 0));

export const pontosDe = (itens: ItemCarrinho[]) =>
  itens.reduce((s, i) => s + (i.ganhoDePontos ?? 0) * i.quantidade, 0);

export const quantidadeTotal = (itens: ItemCarrinho[]) =>
  itens.reduce((s, i) => s + i.quantidade, 0);

export const limitarQuantidade = (q: number) =>
  Math.min(Math.max(Math.trunc(q) || 1, 1), MAX_QUANTIDADE);

export function produtosDoCardapio(categorias: { produtos: ProdutoCardapio[] }[]) {
  return new Map(categorias.flatMap((c) => c.produtos).map((p) => [p.id, p]));
}

// Compara o carrinho com o cardápio atual: atualiza preço, nome e pontos e devolve os
// avisos. Itens esgotados ou fora do cardápio continuam no carrinho (o cliente decide
// remover), mas bloqueiam a finalização.
export function revalidar(
  itens: ItemCarrinho[],
  cardapio: Map<number, ProdutoCardapio>,
): { itens: ItemCarrinho[]; avisos: AvisoCarrinho[] } {
  const avisos: AvisoCarrinho[] = [];
  const atualizados = itens.map((item) => {
    const produto = cardapio.get(item.produtoId);
    if (!produto) {
      avisos.push({ produtoId: item.produtoId, descricao: item.descricao, tipo: 'INDISPONIVEL' });
      return item;
    }
    if (produto.esgotado) {
      avisos.push({ produtoId: item.produtoId, descricao: produto.descricao, tipo: 'ESGOTADO' });
    } else if (centavos(produto.preco) !== centavos(item.preco)) {
      avisos.push({
        produtoId: item.produtoId,
        descricao: produto.descricao,
        tipo: 'PRECO',
        precoAnterior: item.preco,
        precoAtual: produto.preco,
      });
    }
    return {
      ...item,
      descricao: produto.descricao,
      preco: produto.preco,
      imagemUrl: produto.imagemUrl,
      ganhoDePontos: produto.ganhoDePontos,
    };
  });
  return { itens: atualizados, avisos };
}

export const bloqueiaFinalizar = (a: AvisoCarrinho) => a.tipo !== 'PRECO';

// A API tem uma observação por pedido: as observações por item vão juntas, uma por linha,
// seguidas da observação geral.
export function montarObservacao(itens: ItemCarrinho[], geral = ''): string | undefined {
  const linhas = itens
    .filter((i) => i.observacao.trim())
    .map((i) => `${i.quantidade}x ${i.descricao}: ${i.observacao.trim()}`);
  if (geral.trim()) linhas.push(geral.trim());
  const texto = linhas.join('\n');
  return texto ? texto.slice(0, MAX_OBSERVACAO_PEDIDO) : undefined;
}

export function corpoDoPedido(
  itens: ItemCarrinho[],
  dados: Omit<NovoPedido, 'itens' | 'formaPagamento' | 'observacao'> & {
    observacaoGeral?: string;
  },
): NovoPedido {
  const { observacaoGeral, ...resto } = dados;
  return {
    ...resto,
    formaPagamento: 'PIX',
    itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
    observacao: montarObservacao(itens, observacaoGeral),
  };
}

// Chave de idempotência (UUID v4). crypto.randomUUID só existe em contexto seguro (https ou
// localhost); no celular abrindo o dev server pela rede local, usa o getRandomValues.
export function novaChave(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
