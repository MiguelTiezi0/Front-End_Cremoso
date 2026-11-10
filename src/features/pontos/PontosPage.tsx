import { useCallback, useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock, Gift, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProdutoCard } from '@/components/ProdutoCard';
import { CardSkeleton, RowSkeleton } from '@/components/ui/Loaders';
import { EmptyState, ErrorState } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DISPONIVEL } from '@/config/mock';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { pontosService } from '@/api/pontosService';
import { produtoService } from '@/api/catalogoService';
import type { MovimentoPontos, Produto, TipoMovimentoPontos } from '@/types';
import { SEM_PONTOS, extractErrorMessage, formatDataHora, formatPontos } from '@/lib/format';

// Só entram no resgate produtos com preço em pontos (o campo é opcional no contrato).
const custo = (p: Produto): number => p.precoEmPontos ?? 0;

const ROTULO_MOVIMENTO: Record<TipoMovimentoPontos, string> = {
  GANHO: 'Pontos ganhos',
  ESTORNO: 'Estorno',
  AJUSTE: 'Ajuste de saldo',
  RESGATE: 'Resgate',
};

// Saldo e extrato vêm da API (/pontos/saldo e /pontos/extrato). O resgate ainda não existe
// na API: aparece "Em breve" (com o mock ligado, usa o resgate do mock).
export default function PontosPage() {
  const { user, updateUser } = useAuth();
  const [movimentos, setMovimentos] = useState<MovimentoPontos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saldo = user?.saldoPontos ?? 0;

  // Busca saldo e extrato juntos e atualiza o saldo do usuário (o mesmo do /auth/me).
  // Só faz setState nos callbacks da promise, então pode rodar direto no effect.
  const buscar = useCallback(() => {
    if (!user) return;
    Promise.all([pontosService.saldo(user), pontosService.extrato(user)])
      .then(([novoSaldo, extrato]) => {
        setMovimentos(extrato);
        if (novoSaldo !== user.saldoPontos) updateUser({ saldoPontos: novoSaldo });
      })
      .catch((e) => setError(extractErrorMessage(e, 'Não foi possível carregar seus pontos.')))
      .finally(() => setLoading(false));
    // Recarrega só quando muda de usuário (o saldo atualizado aqui não deve disparar de novo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(buscar, [buscar]);

  const carregar = () => {
    setLoading(true);
    setError(null);
    buscar();
  };

  return (
    <>
      <PageHeader title="Pontos & Fidelidade" subtitle="Acumule pontos e troque por sorvetes." />

      {/* Saldo */}
      <section className="mb-8 flex items-center gap-4 overflow-hidden rounded-2xl bg-blueberry-500 p-5 text-white sm:p-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <Gift className="h-7 w-7" />
        </span>
        <div>
          <p className="text-sm text-blueberry-100">Seu saldo atual</p>
          {saldo !== 0 ? (
            <p className="text-3xl font-bold">{formatPontos(saldo)}</p>
          ) : (
            <p className="text-lg font-bold">{SEM_PONTOS}</p>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
            <Sparkles className="h-5 w-5 text-blueberry-600" /> Resgatar com pontos
          </h2>
          {DISPONIVEL.resgate ? (
            <Resgate onResgatou={carregar} />
          ) : (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="Em breve"
              description="Em breve você poderá trocar seus pontos por sorvetes."
            />
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Extrato de pontos</h2>
          {error ? (
            <ErrorState message={error} onRetry={carregar} />
          ) : (
            <div className="card p-0">
              {loading ? (
                <div className="divide-y divide-cream-100">
                  <RowSkeleton cols={2} />
                  <RowSkeleton cols={2} />
                  <RowSkeleton cols={2} />
                </div>
              ) : movimentos.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="Sem movimentações"
                    description="Os pontos entram aqui quando um pedido é concluído."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-cream-100" aria-label="Extrato de pontos">
                  {movimentos.map((m) => {
                    const positivo = m.pontos > 0;
                    return (
                      <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            positivo ? 'bg-mint-100 text-mint-600' : 'bg-strawberry-100 text-strawberry-600'
                          }`}
                        >
                          {positivo ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-700">{m.descricao}</p>
                          <p className="text-xs text-slate-400">
                            {ROTULO_MOVIMENTO[m.tipo]} · {formatDataHora(m.data)}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-bold ${positivo ? 'text-mint-600' : 'text-strawberry-600'}`}
                        >
                          {positivo ? '+' : ''}
                          {m.pontos}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// Resgate: só com o mock ligado (DISPONIVEL.resgate).
function Resgate({ onResgatou }: { onResgatou: () => void }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resgatando, setResgatando] = useState<Produto | null>(null);
  const saldo = user?.saldoPontos ?? 0;

  useEffect(() => {
    let active = true;
    produtoService
      .list()
      .then((prods) => active && setProdutos(prods.filter((p) => p.ativo && custo(p) > 0)))
      .catch((e) => active && setError(extractErrorMessage(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const confirmarResgate = async () => {
    if (!resgatando || !user) return;
    try {
      await pontosService.resgatar(user, resgatando);
      updateUser({ saldoPontos: saldo - custo(resgatando) });
      toast.success(`Resgate de "${resgatando.descricao}" realizado!`);
      onResgatou();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setResgatando(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (produtos.length === 0) return <EmptyState title="Nenhum produto disponível para resgate" />;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {produtos.map((p) => {
          const podeResgatar = saldo >= custo(p) && p.quantidade > 0;
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
                      : `Faltam ${formatPontos(custo(p) - saldo)}`}
                </button>
              }
            />
          );
        })}
      </div>
      <ConfirmDialog
        open={!!resgatando}
        title="Confirmar resgate"
        message={
          resgatando
            ? `Resgatar "${resgatando.descricao}" por ${formatPontos(resgatando.precoEmPontos)}? Seu novo saldo será ${formatPontos(saldo - custo(resgatando))}.`
            : ''
        }
        confirmLabel="Resgatar"
        onConfirm={confirmarResgate}
        onCancel={() => setResgatando(null)}
      />
    </>
  );
}
