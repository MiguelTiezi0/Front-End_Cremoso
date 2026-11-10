import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ProdutoCardapio } from '@/types';
import {
  MAX_OBSERVACAO_ITEM,
  MAX_PRODUTOS_DIFERENTES,
  limitarQuantidade,
  quantidadeTotal,
  type ItemCarrinho,
} from '@/lib/carrinho';

// Carrinho do navegador: funciona sem login e sobrevive a recarregar a página e a fazer
// login no meio do caminho. Preço e pontos guardados aqui são só para exibir; ao abrir o
// carrinho e no checkout, tudo é conferido de novo com o cardápio da API.
const STORAGE_KEY = 'cremoso.carrinho.v1';

function carregar(): ItemCarrinho[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const lista = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(lista)) return [];
    return lista.filter(
      (i): i is ItemCarrinho =>
        typeof i?.produtoId === 'number' && typeof i?.quantidade === 'number',
    );
  } catch {
    return []; // storage bloqueado ou conteúdo inválido: começa vazio
  }
}

interface CarrinhoContextValue {
  itens: ItemCarrinho[];
  quantidadeTotal: number;
  // false quando o carrinho já tem o máximo de produtos diferentes da API.
  adicionar: (produto: ProdutoCardapio, quantidade?: number, observacao?: string) => boolean;
  alterarQuantidade: (produtoId: number, quantidade: number) => void;
  alterarObservacao: (produtoId: number, observacao: string) => void;
  remover: (produtoId: number) => void;
  substituir: (itens: ItemCarrinho[]) => void;
  limpar: () => void;
}

const CarrinhoContext = createContext<CarrinhoContextValue | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>(carregar);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch {
      /* sem storage (aba anônima restrita): o carrinho vale só enquanto a aba está aberta */
    }
  }, [itens]);

  // Outra aba mexeu no carrinho: acompanha.
  useEffect(() => {
    const aoMudar = (e: StorageEvent) => e.key === STORAGE_KEY && setItens(carregar());
    window.addEventListener('storage', aoMudar);
    return () => window.removeEventListener('storage', aoMudar);
  }, []);

  const adicionar = useCallback(
    (produto: ProdutoCardapio, quantidade = 1, observacao = '') => {
      const existe = itens.some((i) => i.produtoId === produto.id);
      if (!existe && itens.length >= MAX_PRODUTOS_DIFERENTES) return false;
      setItens((atual) => {
        const item = atual.find((i) => i.produtoId === produto.id);
        if (item) {
          return atual.map((i) =>
            i.produtoId === produto.id
              ? {
                  ...i,
                  quantidade: limitarQuantidade(i.quantidade + quantidade),
                  observacao: observacao.trim() ? observacao.slice(0, MAX_OBSERVACAO_ITEM) : i.observacao,
                }
              : i,
          );
        }
        return [
          ...atual,
          {
            produtoId: produto.id,
            quantidade: limitarQuantidade(quantidade),
            observacao: observacao.slice(0, MAX_OBSERVACAO_ITEM),
            descricao: produto.descricao,
            preco: produto.preco,
            imagemUrl: produto.imagemUrl,
            ganhoDePontos: produto.ganhoDePontos,
          },
        ];
      });
      return true;
    },
    [itens],
  );

  const alterarQuantidade = useCallback((produtoId: number, quantidade: number) => {
    setItens((atual) =>
      atual.map((i) =>
        i.produtoId === produtoId ? { ...i, quantidade: limitarQuantidade(quantidade) } : i,
      ),
    );
  }, []);

  const alterarObservacao = useCallback((produtoId: number, observacao: string) => {
    setItens((atual) =>
      atual.map((i) =>
        i.produtoId === produtoId
          ? { ...i, observacao: observacao.slice(0, MAX_OBSERVACAO_ITEM) }
          : i,
      ),
    );
  }, []);

  const remover = useCallback((produtoId: number) => {
    setItens((atual) => atual.filter((i) => i.produtoId !== produtoId));
  }, []);

  const limpar = useCallback(() => setItens([]), []);

  const value = useMemo<CarrinhoContextValue>(
    () => ({
      itens,
      quantidadeTotal: quantidadeTotal(itens),
      adicionar,
      alterarQuantidade,
      alterarObservacao,
      remover,
      substituir: setItens,
      limpar,
    }),
    [itens, adicionar, alterarQuantidade, alterarObservacao, remover, limpar],
  );

  return <CarrinhoContext.Provider value={value}>{children}</CarrinhoContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCarrinho(): CarrinhoContextValue {
  const ctx = useContext(CarrinhoContext);
  if (!ctx) throw new Error('useCarrinho deve ser usado dentro de <CarrinhoProvider>');
  return ctx;
}
