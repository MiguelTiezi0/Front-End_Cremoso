import { AlertTriangle } from 'lucide-react';
import type { AvisoCarrinho } from '@/lib/carrinho';
import { formatBRL } from '@/lib/format';

function texto(a: AvisoCarrinho): string {
  switch (a.tipo) {
    case 'ESGOTADO':
      return `${a.descricao} esgotou. Remova do carrinho para continuar.`;
    case 'INDISPONIVEL':
      return `${a.descricao} não está mais no cardápio. Remova do carrinho para continuar.`;
    case 'PRECO':
      return `${a.descricao} mudou de preço: de ${formatBRL(a.precoAnterior ?? 0)} para ${formatBRL(
        a.precoAtual ?? 0,
      )}.`;
  }
}

// Avisos da revalidação do carrinho com o cardápio da API.
export function AvisosCarrinho({ avisos }: { avisos: AvisoCarrinho[] }) {
  if (avisos.length === 0) return null;
  return (
    <div
      role="alert"
      className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <p className="flex items-center gap-2 font-bold">
        <AlertTriangle className="h-4 w-4" /> Seu carrinho mudou
      </p>
      <ul className="list-disc space-y-0.5 pl-5">
        {avisos.map((a) => (
          <li key={`${a.produtoId}-${a.tipo}`}>{texto(a)}</li>
        ))}
      </ul>
    </div>
  );
}
