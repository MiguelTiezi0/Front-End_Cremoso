import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Gift, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProdutoCard } from '@/components/ProdutoCard';
import { CardSkeleton, RowSkeleton } from '@/components/ui/Loaders';
import { EmptyState, ErrorState } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { pontosService } from '@/api/pontosService';
import { produtoService } from '@/api/catalogoService';
import type { MovimentoPontos, Produto } from '@/types';
import { extractErrorMessage, formatDataHora, formatPontos } from '@/lib/format';

export default function PontosPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [movimentos, setMovimentos] = useState<MovimentoPontos[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resgatando, setResgatando] = useState<Produto | null>(null);

  const saldo = user?.saldoPontos ?? 0;

  const carregar = () => {
    setLoading(true);
    setError(null);
    Promise.all([pontosService.extrato(), produtoService.list()])
      .then(([extrato, prods]) => {
        setMovimentos(extrato);
        setProdutos(prods.filter((p) => p.ativo && p.precoEmPontos > 0));
      })
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  const confirmarResgate = async () => {
    if (!resgatando || !user) return;
    try {
      await pontosService.resgatar(user.id, resgatando.id);
      updateUser({ saldoPontos: saldo - resgatando.precoEmPontos });
      toast.success(`Resgate de "${resgatando.descricao}" realizado!`);
      setResgatando(null);
      carregar();
    } catch (err) {
      toast.error(extractErrorMessage(err));
      setResgatando(null);
    }
  };

  return (
    <>
      <PageHeader title="Pontos & Fidelidade" subtitle="Acumule pontos e troque por sorvetes." />

      {/* Saldo */}
      <section className="mb-8 flex items-center gap-4 overflow-hidden rounded-2xl bg-blueberry-500 p-6 text-white">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
          <Gift className="h-7 w-7" />
        </span>
        <div>
          <p className="text-sm text-blueberry-100">Seu saldo atual</p>
          <p className="text-3xl font-bold">{formatPontos(saldo)}</p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Resgate */}
        <section className="lg:col-span-3">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
            <Sparkles className="h-5 w-5 text-blueberry-600" /> Resgatar com pontos
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={carregar} />
          ) : produtos.length === 0 ? (
            <EmptyState title="Nenhum produto disponível para resgate" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {produtos.map((p) => {
                const podeResgatar = saldo >= p.precoEmPontos && p.quantidade > 0;
                return (
                  <ProdutoCard
                    key={p.id}
                    produto={p}
                    footer={
                      <button
                        className={podeResgatar ? 'btn-secondary mt-3 w-full' : 'btn-ghost mt-3 w-full'}
                        disabled={!podeResgatar}
                        onClick={() => setResgatando(p)}
                      >
                        <Gift className="h-4 w-4" />
                        {p.quantidade <= 0
                          ? 'Esgotado'
                          : podeResgatar
                            ? 'Resgatar'
                            : `Faltam ${formatPontos(p.precoEmPontos - saldo)}`}
                      </button>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Extrato */}
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Extrato de pontos</h2>
          <div className="card p-0">
            {loading ? (
              <div className="divide-y divide-cream-100">
                <RowSkeleton cols={2} />
                <RowSkeleton cols={2} />
                <RowSkeleton cols={2} />
              </div>
            ) : movimentos.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Sem movimentações" description="Faça um pedido para ganhar pontos." />
              </div>
            ) : (
              <ul className="divide-y divide-cream-100">
                {movimentos.map((m) => {
                  const ganho = m.tipo === 'GANHO';
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          ganho ? 'bg-mint-100 text-mint-600' : 'bg-strawberry-100 text-strawberry-600'
                        }`}
                      >
                        {ganho ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700">{m.descricao}</p>
                        <p className="text-xs text-slate-400">{formatDataHora(m.data)}</p>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          ganho ? 'text-mint-600' : 'text-strawberry-600'
                        }`}
                      >
                        {ganho ? '+' : ''}
                        {m.pontos}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={!!resgatando}
        title="Confirmar resgate"
        message={
          resgatando
            ? `Resgatar "${resgatando.descricao}" por ${formatPontos(resgatando.precoEmPontos)}? Seu novo saldo será ${formatPontos(saldo - resgatando.precoEmPontos)}.`
            : ''
        }
        confirmLabel="Resgatar"
        onConfirm={confirmarResgate}
        onCancel={() => setResgatando(null)}
      />
    </>
  );
}
