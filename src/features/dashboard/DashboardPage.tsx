import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, PackageX, Sparkles, Tags } from 'lucide-react';
import { ProdutoCard } from '@/components/ProdutoCard';
import { CardSkeleton, Skeleton } from '@/components/ui/Loaders';
import { EmptyState, ErrorState, StatusPedidoBadge } from '@/components/ui/Misc';
import { useAuth } from '@/context/AuthContext';
import { categoriaService, produtoService } from '@/api/catalogoService';
import { pedidoService } from '@/api/pedidoService';
import { DISPONIVEL } from '@/config/mock';
import type { PedidoResumo, Produto } from '@/types';
import { SEM_PONTOS, extractErrorMessage, formatBRL, formatData, formatPontos } from '@/lib/format';

// Destaques: os 4 produtos ativos com estoque mais recentes (id decrescente).
const destaques = (ativos: Produto[]): Produto[] =>
  ativos
    .filter((p) => p.quantidade > 0)
    .sort((a, b) => b.id - a.id)
    .slice(0, 4);

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <ClienteDashboard />;
}

function ClienteDashboard() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [erroProdutos, setErroProdutos] = useState<string | null>(null);
  const [ultimoPedido, setUltimoPedido] = useState<PedidoResumo | null>(null);

  // Destaques e último pedido carregam separados: se um falhar, o outro continua na tela.
  // Só faz setState nos callbacks da promise; devolve a função que cancela a atualização.
  const buscarDestaques = useCallback(() => {
    let active = true;
    produtoService
      .listAtivos()
      .then((prods) => active && setProdutos(destaques(prods)))
      .catch((e) => active && setErroProdutos(extractErrorMessage(e, 'Não foi possível carregar os destaques.')))
      .finally(() => active && setLoadingProdutos(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(buscarDestaques, [buscarDestaques]);

  const recarregarDestaques = () => {
    setLoadingProdutos(true);
    setErroProdutos(null);
    buscarDestaques();
  };

  useEffect(() => {
    if (!DISPONIVEL.pedidos) return; // módulo sem backend: o card não aparece
    let active = true;
    pedidoService
      .list()
      .then((pedidos) => active && setUltimoPedido(pedidos[0] ?? null))
      // O card do último pedido é opcional: em caso de erro ele só não aparece.
      .catch(() => active && setUltimoPedido(null));
    return () => {
      active = false;
    };
  }, []);

  const primeiroNome = user?.nome.split(' ')[0] ?? '';

  return (
    <div className="space-y-8">
      {/* Saudação + destaque de pontos */}
      <section className="overflow-hidden rounded-2xl bg-blueberry-500 p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-blueberry-100">Olá, {primeiroNome}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">O que vamos saborear hoje?</h1>
          </div>
          <div className="rounded-xl bg-white/10 px-5 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-blueberry-100">
              Saldo de pontos
            </p>
            {user?.saldoPontos ? (
              <p className="text-2xl font-bold">{formatPontos(user.saldoPontos)}</p>
            ) : (
              <p className="max-w-44 text-sm font-semibold">{SEM_PONTOS}</p>
            )}
          </div>
        </div>
      </section>

      {/* Status do último pedido */}
      {ultimoPedido && (
        <section className="card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blueberry-50 text-blueberry-600">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-700">
                Último pedido · #{ultimoPedido.id}
              </p>
              <p className="text-xs text-slate-400">
                {formatData(ultimoPedido.data)} · {formatBRL(ultimoPedido.total)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPedidoBadge status={ultimoPedido.status} />
            <Link
              to={`/pedidos/${ultimoPedido.id}`}
              className="text-sm font-bold text-blueberry-500 hover:underline"
            >
              Acompanhar
            </Link>
          </div>
        </section>
      )}

      {/* Destaques */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Sparkles className="h-5 w-5 text-blueberry-600" /> Destaques de hoje
          </h2>
          <Link
            to="/catalogo"
            className="flex items-center gap-1 text-sm font-bold text-blueberry-500 hover:underline"
          >
            Ver catálogo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loadingProdutos ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : erroProdutos ? (
          <ErrorState message={erroProdutos} onRetry={recarregarDestaques} />
        ) : produtos.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-8 w-8" />}
            title="Nenhum destaque hoje"
            description="Volte mais tarde para conferir as novidades."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {produtos.map((p) => (
              <ProdutoCard key={p.id} produto={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [totalCategorias, setTotalCategorias] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([produtoService.list(), categoriaService.list()])
      .then(([prods, categorias]) => {
        if (!active) return;
        setProdutos(prods);
        setTotalCategorias(categorias.length);
      })
      .catch((e) => active && setErro(extractErrorMessage(e, 'Não foi possível carregar o painel.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const primeiroNome = user?.nome.split(' ')[0] ?? '';
  const ativos = produtos.filter((p) => p.ativo).length;
  const esgotados = produtos.filter((p) => p.quantidade <= 0).length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl bg-blueberry-500 p-6 text-white sm:p-8">
        <p className="text-blueberry-100">Olá, {primeiroNome}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Painel administrativo</h1>
      </section>

      {erro && <ErrorState message={erro} />}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Produtos ativos"
          value={ativos}
          loading={loading}
          to="/admin/produtos"
        />
        <StatCard
          icon={<PackageX className="h-5 w-5" />}
          label="Produtos esgotados"
          value={esgotados}
          loading={loading}
          to="/admin/produtos"
        />
        <StatCard
          icon={<Tags className="h-5 w-5" />}
          label="Categorias"
          value={totalCategorias}
          loading={loading}
          to="/admin/categorias"
        />
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="card flex items-center gap-4 transition-colors hover:border-blueberry-200"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blueberry-50 text-blueberry-600">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-6 w-10" />
        ) : (
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        )}
      </div>
    </Link>
  );
}
