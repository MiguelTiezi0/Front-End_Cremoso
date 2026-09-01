import type { ReactNode } from 'react';
import type { StatusPedido } from '@/types';

// Estado vazio genérico.
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-200 bg-white/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <h3 className="text-base font-bold text-slate-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Mensagem de erro amigável com opção de "tentar novamente".
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-strawberry-200 bg-strawberry-100/50 px-6 py-8 text-center">
      <p className="text-sm font-semibold text-strawberry-700">{message}</p>
      {onRetry && (
        <button className="btn-ghost mt-4" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blueberry-300 focus:ring-offset-1 ${
        checked ? 'bg-mint-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// Badge de status ativo/inativo.
export function AtivoBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`badge ${
        ativo ? 'bg-mint-100 text-mint-600' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

// Badge de status de pedido com cores por estado.
const STATUS_LABEL: Record<StatusPedido, string> = {
  RECEBIDO: 'Recebido',
  EM_PREPARO: 'Em preparo',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const STATUS_STYLE: Record<StatusPedido, string> = {
  RECEBIDO: 'bg-blueberry-100 text-blueberry-600',
  EM_PREPARO: 'bg-cream-200 text-amber-700',
  SAIU_PARA_ENTREGA: 'bg-strawberry-100 text-strawberry-700',
  ENTREGUE: 'bg-mint-100 text-mint-600',
  CANCELADO: 'bg-slate-100 text-slate-500',
};

export function StatusPedidoBadge({ status }: { status: StatusPedido }) {
  return <span className={`badge ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export { STATUS_LABEL };
