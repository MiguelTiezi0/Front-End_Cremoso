import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IceCreamCone, ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProdutoCardapioCard } from '@/components/ProdutoCardapioCard';
import { LojaStatus } from '@/components/LojaStatus';
import { CardSkeleton } from '@/components/ui/Loaders';
import { EmptyState, ErrorState } from '@/components/ui/Misc';
import { lojaService } from '@/api/lojaService';
import { useCarrinho } from '@/context/CarrinhoContext';
import { useToast } from '@/context/ToastContext';
import { useLoja } from '@/hooks/useLoja';
import type { CategoriaCardapio, ProdutoCardapio } from '@/types';
import { MAX_PRODUTOS_DIFERENTES, subtotalDe } from '@/lib/carrinho';
import { extractErrorMessage, formatBRL } from '@/lib/format';

// Cardápio público (GET /cardapio, sem login): categorias ativas com os produtos ativos.
// Esgotado aparece marcado e não entra no carrinho.
export default function CatalogoPage() {
  const [categorias, setCategorias] = useState<CategoriaCardapio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | 'TODAS'>('TODAS');
  const { loja } = useLoja();
  const carrinho = useCarrinho();
  const toast = useToast();

  // Só faz setState nos callbacks da promise, então pode rodar direto no effect.
  const buscar = useCallback(() => {
    lojaService
      .cardapio()
      .then((c) => setCategorias(c.categorias))
      .catch((e) => setError(extractErrorMessage(e, 'Não foi possível carregar o catálogo.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(buscar, [buscar]);

  const carregar = () => {
    setLoading(true);
    setError(null);
    buscar();
  };

  const visiveis = useMemo(
    () => (categoriaId === 'TODAS' ? categorias : categorias.filter((c) => c.id === categoriaId)),
    [categorias, categoriaId],
  );

  const adicionar = (produto: ProdutoCardapio) => {
    if (!carrinho.adicionar(produto)) {
      toast.error(`O carrinho aceita até ${MAX_PRODUTOS_DIFERENTES} produtos diferentes.`);
      return;
    }
    toast.success(`${produto.descricao} no carrinho.`);
  };

  return (
    <div className={carrinho.quantidadeTotal > 0 ? 'pb-24' : undefined}>
      <PageHeader title="Catálogo" subtitle="Escolha seu sabor favorito." />

      {loja && (
        <div className="mb-5">
          <LojaStatus loja={loja} />
        </div>
      )}

      {categorias.length > 1 && (
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por categoria">
          {[{ id: 'TODAS' as const, nome: 'Todas' }, ...categorias].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaId(c.id)}
              aria-pressed={categoriaId === c.id}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                categoriaId === c.id
                  ? 'bg-blueberry-500 text-white'
                  : 'bg-white text-slate-500 ring-1 ring-cream-200 hover:bg-cream-100'
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={carregar} />
      ) : visiveis.length === 0 ? (
        <EmptyState
          icon={<IceCreamCone className="h-10 w-10" />}
          title="Nenhum produto disponível"
          description="Volte mais tarde para conferir as novidades."
        />
      ) : (
        <div className="space-y-8">
          {visiveis.map((c) => (
            <section key={c.id}>
              <h2 className="mb-3 text-lg font-bold text-slate-800">{c.nome}</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {c.produtos.map((p) => (
                  <ProdutoCardapioCard key={p.id} produto={p} categoria={c.nome} onAdicionar={adicionar} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Atalho fixo para o carrinho (principalmente no celular). */}
      {carrinho.quantidadeTotal > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-200 bg-white/95 p-3 backdrop-blur">
          <Link
            to="/carrinho"
            className="btn-primary mx-auto flex w-full max-w-md justify-between"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Ver carrinho ({carrinho.quantidadeTotal})
            </span>
            <span>{formatBRL(subtotalDe(carrinho.itens))}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
