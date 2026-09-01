import { Bell, CheckCheck, Gift, Package, Sparkles, Tag } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/Misc';
import { Spinner } from '@/components/ui/Loaders';
import { useNotifications } from '@/context/NotificationContext';
import type { TipoNotificacao } from '@/types';
import { formatDataHora } from '@/lib/format';

const ICON: Record<TipoNotificacao, typeof Bell> = {
  PEDIDO: Package,
  PONTOS: Gift,
  PROMOCAO: Tag,
  SISTEMA: Sparkles,
};

const COR: Record<TipoNotificacao, string> = {
  PEDIDO: 'bg-blueberry-100 text-blueberry-600',
  PONTOS: 'bg-mint-100 text-mint-600',
  PROMOCAO: 'bg-strawberry-100 text-strawberry-600',
  SISTEMA: 'bg-cream-200 text-amber-700',
};

export default function NotificacoesPage() {
  const { notificacoes, naoLidas, loading, markLida, markTodasLidas } = useNotifications();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notificações"
        subtitle={naoLidas ? `${naoLidas} não lida(s)` : 'Tudo em dia por aqui!'}
        action={
          naoLidas > 0 ? (
            <button className="btn-ghost" onClick={() => void markTodasLidas()}>
              <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
            </button>
          ) : undefined
        }
      />

      {loading && notificacoes.length === 0 ? (
        <div className="flex justify-center py-12 text-blueberry-600">
          <Spinner className="h-6 w-6" />
        </div>
      ) : notificacoes.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="Nenhuma notificação"
          description="Você será avisado sobre pedidos, pontos e promoções."
        />
      ) : (
        <ul className="space-y-3">
          {notificacoes.map((n) => {
            const Icon = ICON[n.tipo];
            return (
              <li
                key={n.id}
                className={`card flex items-start gap-4 ${
                  n.lida ? '' : 'ring-2 ring-blueberry-200'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${COR[n.tipo]}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-800">{n.titulo}</p>
                    {!n.lida && (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-strawberry-500" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.mensagem}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{formatDataHora(n.data)}</span>
                    {!n.lida && (
                      <button
                        onClick={() => void markLida(n.id)}
                        className="text-xs font-bold text-blueberry-500 hover:underline"
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
