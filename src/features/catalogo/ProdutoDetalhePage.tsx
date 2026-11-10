import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react';
import { ProdutoImagem } from '@/components/ui/ProdutoImagem';
import { CardSkeleton } from '@/components/ui/Loaders';
import { EmptyState, ErrorState } from '@/components/ui/Misc';
import { LojaStatus } from '@/components/LojaStatus';
import { lojaService } from '@/api/lojaService';
import { useCarrinho } from '@/context/CarrinhoContext';
import { useToast } from '@/context/ToastContext';
import { useLoja } from '@/hooks/useLoja';
import type { ProdutoCardapio } from '@/types';
import {
  MAX_OBSERVACAO_ITEM,
  MAX_PRODUTOS_DIFERENTES,
  MAX_QUANTIDADE,
  limitarQuantidade,
} from '@/lib/carrinho';
import { extractErrorMessage, formatBRL, formatPontos } from '@/lib/format';

// Detalhe do produto (público). Usa o cardápio: é ele que diz se está ativo e esgotado.
export default function ProdutoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const carrinho = useCarrinho();
  const toast = useToast();
  const { loja } = useLoja();
  const [produto, setProduto] = useState<ProdutoCardapio | null>(null);
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    let ativo = true;
    lojaService
      .cardapio()
      .then(({ categorias }) => {
        if (!ativo) return;
        for (const c of categorias) {
          const p = c.produtos.find((x) => x.id === Number(id));
          if (p) {
            setProduto(p);
            setCategoria(c.nome);
            return;
          }
        }
        setProduto(null);
      })
      .catch((e) => ativo && setError(extractErrorMessage(e, 'Não foi possível carregar o produto.')))
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
  }, [id]);

  const adicionar = () => {
    if (!produto) return;
    if (!carrinho.adicionar(produto, quantidade, observacao)) {
      toast.error(`O carrinho aceita até ${MAX_PRODUTOS_DIFERENTES} produtos diferentes.`);
      return;
    }
    toast.success(`${produto.descricao} no carrinho.`);
    navigate('/catalogo');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/catalogo"
        className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-blueberry-500 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
      </Link>

      {loading ? (
        <CardSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : !produto ? (
        <EmptyState
          title="Produto indisponível"
          description="Este produto não está no cardápio agora."
          action={
            <Link to="/catalogo" className="btn-primary">
              Ver o catálogo
            </Link>
          }
        />
      ) : (
        <div className="card overflow-hidden p-0 md:grid md:grid-cols-2">
          <div className="relative h-56 bg-cream-100 md:h-full md:min-h-72">
            <ProdutoImagem
              src={produto.imagemUrl}
              alt={produto.descricao}
              className={`h-full w-full ${produto.esgotado ? 'opacity-50 grayscale' : ''}`}
            />
            {produto.esgotado && (
              <span className="badge absolute right-3 top-3 bg-slate-800/80 text-white">Esgotado</span>
            )}
          </div>
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{categoria}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-800">{produto.descricao}</h1>
              <p className="mt-2 text-2xl font-bold text-slate-800">{formatBRL(produto.preco)}</p>
              {produto.ganhoDePontos ? (
                <p className="mt-1 text-sm font-bold text-strawberry-600">
                  Ganhe {formatPontos(produto.ganhoDePontos)} por unidade
                </p>
              ) : null}
            </div>

            {loja && <LojaStatus loja={loja} compacto />}

            {produto.esgotado ? (
              <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
                Esgotado no momento. Volte mais tarde!
              </p>
            ) : (
              <>
                <div>
                  <span className="label">Quantidade</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="btn-ghost h-11 w-11 p-0"
                      aria-label="Diminuir quantidade"
                      disabled={quantidade <= 1}
                      onClick={() => setQuantidade((q) => limitarQuantidade(q - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-lg font-bold" aria-live="polite">
                      {quantidade}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost h-11 w-11 p-0"
                      aria-label="Aumentar quantidade"
                      disabled={quantidade >= MAX_QUANTIDADE}
                      onClick={() => setQuantidade((q) => limitarQuantidade(q + 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="observacao-produto" className="label">
                    Observação (opcional)
                  </label>
                  <input
                    id="observacao-produto"
                    className="input"
                    placeholder="Ex.: sem cobertura"
                    maxLength={MAX_OBSERVACAO_ITEM}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                </div>
                <button type="button" className="btn-primary w-full" onClick={adicionar}>
                  <ShoppingCart className="h-4 w-4" />
                  Adicionar · {formatBRL(produto.preco * quantidade)}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
