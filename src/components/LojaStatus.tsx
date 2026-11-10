import { Clock, Store } from 'lucide-react';
import type { Loja } from '@/types';
import { statusLojaTexto } from '@/lib/loja';
import { formatBRL } from '@/lib/format';

// Faixa "Aberto agora" / "Fechado, abre às HH:MM" (catálogo, carrinho, checkout).
export function LojaStatus({ loja, compacto = false }: { loja: Loja; compacto?: boolean }) {
  const status = statusLojaTexto(loja);
  return (
    <div
      data-testid="status-loja"
      className={`flex flex-wrap items-start gap-3 rounded-2xl px-4 py-3 text-sm ${
        status.aberta ? 'bg-mint-100 text-mint-600' : 'bg-cream-200 text-slate-600'
      }`}
    >
      {status.aberta ? (
        <Store className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold">{status.titulo}</p>
        {status.detalhe && <p className="text-xs">{status.detalhe}</p>}
        {!compacto && status.aberta && loja.entregaAtiva && (
          <p className="text-xs">
            Retirada na loja ou entrega em {loja.cidade} ({formatBRL(loja.taxaEntrega)})
            {loja.pedidoMinimo ? ` · pedido mínimo para entrega ${formatBRL(loja.pedidoMinimo)}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}
