import { Minus, Plus } from 'lucide-react';
import { MAX_QUANTIDADE } from '@/lib/carrinho';

// − 2 + com área de toque de 40px (celular).
export function QuantidadeControle({
  valor,
  onChange,
  rotulo,
}: {
  valor: number;
  onChange: (n: number) => void;
  rotulo: string;
}) {
  return (
    <div className="flex items-center rounded-xl ring-1 ring-slate-200">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center text-slate-500 disabled:opacity-40"
        aria-label={`Diminuir quantidade de ${rotulo}`}
        disabled={valor <= 1}
        onClick={() => onChange(valor - 1)}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-7 text-center text-sm font-bold" aria-label={`Quantidade de ${rotulo}`}>
        {valor}
      </span>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center text-slate-500 disabled:opacity-40"
        aria-label={`Aumentar quantidade de ${rotulo}`}
        disabled={valor >= MAX_QUANTIDADE}
        onClick={() => onChange(valor + 1)}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
