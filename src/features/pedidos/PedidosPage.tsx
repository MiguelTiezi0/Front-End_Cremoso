import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowSkeleton } from '@/components/ui/Loaders';
import { EmptyState, ErrorState, StatusPedidoBadge } from '@/components/ui/Misc';
import { pedidoService } from '@/api/pedidoService';
import { ProdutoImagem } from '@/components/ui/ProdutoImagem';
import type { PedidoResumo, StatusPedido } from '@/types';
import { extractErrorMessage, formatBRL, formatData } from '@/lib/format';

// Filtros por fase (mais simples que os 7 status no celular).
type Filtro = 'TODOS' | 'ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'ANDAMENTO', rotulo: 'Em andamento' },
  { valor: 'CONCLUIDO', rotulo: 'Concluídos' },
  { valor: 'CANCELADO', rotulo: 'Cancelados' },
];

const EM_ANDAMENTO: StatusPedido[] = ['RECEBIDO', 'ACEITO', 'EM_PREPARO', 'PRONTO', 'SAIU_PARA_ENTREGA'];

const passa = (p: PedidoResumo, f: Filtro) =>
  f === 'TODOS' || (f === 'ANDAMENTO' ? EM_ANDAMENTO.includes(p.status) : p.status === f);

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  // Só faz setState nos callbacks da promise, então pode rodar direto no effect.
  const buscar = useCallback(() => {
    pedidoService
      .list()
      .then(setPedidos)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(buscar, [buscar]);

  const carregar = () => {
    setLoading(true);
    setError(null);
    buscar();
  };

  const filtrados = useMemo(
    () => pedidos.filter((p) => passa(p, filtro)),
    [pedidos, filtro],
  );

  return (
    <>
      <PageHeader title="Meus pedidos" subtitle="Acompanhe o status das suas compras." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            aria-pressed={filtro === f.valor}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              filtro === f.valor
                ? 'bg-blueberry-500 text-white'
                : 'bg-white text-slate-500 ring-1 ring-cream-200 hover:bg-cream-100'
            }`}
          >
            {f.rotulo}
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
          title={pedidos.length === 0 ? 'Você ainda não fez pedidos' : 'Nenhum pedido encontrado'}
          description={
            pedidos.length === 0 ? 'Escolha seus sabores no catálogo.' : 'Não há pedidos com esse filtro.'
          }
          action={
            pedidos.length === 0 ? (
              <Link to="/catalogo" className="btn-primary">
                Ver o catálogo
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => (
            <Link
              key={p.id}
              to={`/pedidos/${p.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-blueberry-200 sm:p-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex shrink-0 -space-x-3">
                  {(p.imagens.length > 0 ? p.imagens : [null]).map((src, i) => (
                    <ProdutoImagem
                      key={i}
                      src={src}
                      alt=""
                      className="h-11 w-11 rounded-full border-2 border-white"
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">Pedido #{p.id}</p>
                  <p className="text-xs text-slate-400">
                    {formatData(p.data)} · {p.quantidadeItens}{' '}
                    {p.quantidadeItens === 1 ? 'item' : 'itens'} ·{' '}
                    {p.tipoEntrega === 'ENTREGA' ? 'Entrega' : 'Retirada'}
                  </p>
                  {p.status !== 'CANCELADO' && p.statusPagamento === 'PENDENTE' && (
                    <p className="text-xs font-bold text-strawberry-600">Aguardando pagamento do Pix</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusPedidoBadge status={p.status} />
                <span className="text-base font-bold text-slate-800 sm:text-lg">{formatBRL(p.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
