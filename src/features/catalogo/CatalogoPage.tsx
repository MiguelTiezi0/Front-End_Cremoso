import { useCallback, useEffect, useMemo, useState } from 'react';
import { IceCreamCone } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProdutoCard } from '@/components/ProdutoCard';
import { CardSkeleton } from '@/components/ui/Loaders';
import { EmptyState, ErrorState } from '@/components/ui/Misc';
import { produtoService } from '@/api/catalogoService';
import type { Produto } from '@/types';
import { extractErrorMessage } from '@/lib/format';

// Catálogo do cliente: produtos ativos (GET /produtos/ativos), com filtro por categoria.
export default function CatalogoPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | 'TODAS'>('TODAS');

  // Só faz setState nos callbacks da promise, então pode rodar direto no effect.
  const buscar = useCallback(() => {
    produtoService
      .listAtivos()
      .then(setProdutos)
      .catch((e) => setError(extractErrorMessage(e, 'Não foi possível carregar o catálogo.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(buscar, [buscar]);

  const carregar = () => {
    setLoading(true);
    setError(null);
    buscar();
  };

  const categorias = useMemo(() => {
    const porId = new Map(produtos.map((p) => [p.categoria.id, p.categoria]));
    return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [produtos]);

  const visiveis =
    categoriaId === 'TODAS' ? produtos : produtos.filter((p) => p.categoria.id === categoriaId);

  return (
    <>
      <PageHeader title="Catálogo" subtitle="Escolha seu sabor favorito." />

      {categorias.length > 1 && (
        <select
          className="input mb-5 sm:max-w-xs"
          value={categoriaId}
          onChange={(e) =>
            setCategoriaId(e.target.value === 'TODAS' ? 'TODAS' : Number(e.target.value))
          }
          aria-label="Filtrar por categoria"
        >
          <option value="TODAS">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {visiveis.map((p) => (
            <ProdutoCard key={p.id} produto={p} />
          ))}
        </div>
      )}
    </>
  );
}
