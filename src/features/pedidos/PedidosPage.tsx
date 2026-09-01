import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowSkeleton } from '@/components/ui/Loaders';
import { EmptyState, ErrorState, StatusPedidoBadge, STATUS_LABEL } from '@/components/ui/Misc';
import { pedidoService } from '@/api/pedidoService';
import type { Pedido, StatusPedido } from '@/types';
import { extractErrorMessage, formatBRL, formatData } from '@/lib/format';

type Filtro = 'TODOS' | StatusPedido;

const FILTROS: Filtro[] = [
  'TODOS',
  'RECEBIDO',
  'EM_PREPARO',
  'SAIU_PARA_ENTREGA',
  'ENTREGUE',
  'CANCELADO',
];

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  const carregar = () => {
    setLoading(true);
    setError(null);
    pedidoService
      .list()
      .then(setPedidos)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  const filtrados = useMemo(
    () => (filtro === 'TODOS' ? pedidos : pedidos.filter((p) => p.status === filtro)),
    [pedidos, filtro],
  );

  return (
    <>
      <PageHeader title="Meus pedidos" subtitle="Acompanhe o status das suas compras." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filtro === f
                ? 'bg-blueberry-500 text-white'
                : 'bg-white text-slate-500 ring-1 ring-cream-200 hover:bg-cream-100'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card space-y-2 p-2">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={carregar} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10" />}
          title="Nenhum pedido encontrado"
          description="Não há pedidos com esse filtro."
        />
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => (
            <Link
              key={p.id}
              to={`/pedidos/${p.id}`}
              className="card flex flex-wrap items-center justify-between gap-4 transition-colors hover:border-blueberry-200"
            >
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {p.itens.slice(0, 3).map((item) => (
                    <img
                      key={item.produtoId}
                      src={item.imagemUrl}
                      alt=""
                      className="h-11 w-11 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <div>
                  <p className="font-bold text-slate-800">Pedido #{p.id}</p>
                  <p className="text-xs text-slate-400">
                    {formatData(p.data)} · {p.itens.reduce((s, i) => s + i.quantidade, 0)} item(ns) ·{' '}
                    {p.tipoEntrega === 'ENTREGA' ? 'Entrega' : 'Retirada'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StatusPedidoBadge status={p.status} />
                <span className="text-lg font-bold text-slate-800">{formatBRL(p.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
