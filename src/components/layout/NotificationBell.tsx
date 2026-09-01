import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Gift, Package, Sparkles, Tag } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import type { TipoNotificacao } from '@/types';
import { formatDataHora } from '@/lib/format';

const ICON: Record<TipoNotificacao, typeof Bell> = {
  PEDIDO: Package,
  PONTOS: Gift,
  PROMOCAO: Tag,
  SISTEMA: Sparkles,
};

export function NotificationBell() {
  const { notificacoes, naoLidas, markLida, markTodasLidas } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-slate-500 hover:bg-cream-100 hover:text-blueberry-600"
        aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-strawberry-500 px-1 text-[10px] font-bold text-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3">
            <span className="text-sm font-bold text-slate-800">Notificações</span>
            {naoLidas > 0 && (
              <button
                onClick={() => void markTodasLidas()}
                className="flex items-center gap-1 text-xs font-bold text-blueberry-500 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                Nenhuma notificação por aqui.
              </p>
            ) : (
              notificacoes.slice(0, 6).map((n) => {
                const Icon = ICON[n.tipo];
                return (
                  <button
                    key={n.id}
                    onClick={() => void markLida(n.id)}
                    className={`flex w-full gap-3 border-b border-cream-100 px-4 py-3 text-left transition-colors hover:bg-cream-50 ${
                      n.lida ? 'opacity-70' : 'bg-blueberry-50/60'
                    }`}
                  >
                    <span className="mt-0.5 text-blueberry-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-slate-700">{n.titulo}</span>
                      <span className="block text-xs text-slate-500">{n.mensagem}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {formatDataHora(n.data)}
                      </span>
                    </span>
                    {!n.lida && <span className="mt-1 h-2 w-2 rounded-full bg-strawberry-500" />}
                  </button>
                );
              })
            )}
          </div>
          <Link
            to="/notificacoes"
            onClick={() => setOpen(false)}
            className="block border-t border-cream-200 py-3 text-center text-sm font-bold text-blueberry-500 hover:bg-cream-50"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
