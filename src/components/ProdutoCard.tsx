import type { Produto } from '@/types';
import { formatBRL, formatPontos } from '@/lib/format';

// Card de produto reutilizável (dashboard, catálogo, resgate).
export function ProdutoCard({
  produto,
  footer,
}: {
  produto: Produto;
  footer?: React.ReactNode;
}) {
  const semEstoque = produto.quantidade <= 0;
  return (
    <div className="card flex flex-col overflow-hidden p-0">
      <div className="relative h-36 w-full overflow-hidden bg-cream-100">
        <img
          src={produto.imagemUrl}
          alt={produto.descricao}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
        {semEstoque && (
          <span className="absolute right-2 top-2 badge bg-slate-800/80 text-white">Esgotado</span>
        )}
        <span className="absolute left-2 top-2 badge bg-strawberry-500 text-white">
          +{produto.ganhoDePontos} pts
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {produto.categoria.nome}
        </p>
        <h3 className="font-bold leading-snug text-slate-800">{produto.descricao}</h3>
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="text-lg font-bold text-slate-800">{formatBRL(produto.preco)}</span>
          <span className="text-xs font-bold text-blueberry-600">
            {formatPontos(produto.precoEmPontos)}
          </span>
        </div>
        {footer}
      </div>
    </div>
  );
}
