import type { Produto } from '@/types';
import { SEM_VALOR, formatBRL, formatPontos } from '@/lib/format';
import { ProdutoImagem } from './ui/ProdutoImagem';

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
        <ProdutoImagem src={produto.imagemUrl} alt={produto.descricao} className="h-full w-full" />
        {semEstoque && (
          <span className="absolute right-2 top-2 badge bg-slate-800/80 text-white">Esgotado</span>
        )}
        <span
          className="absolute left-2 top-2 badge bg-strawberry-500 text-white"
          title="Pontos ganhos na compra"
        >
          {produto.ganhoDePontos === null ? SEM_VALOR : `+${formatPontos(produto.ganhoDePontos)}`}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {produto.categoria.nome}
        </p>
        <h3 className="font-bold leading-snug text-slate-800">{produto.descricao}</h3>
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="text-lg font-bold text-slate-800">{formatBRL(produto.preco)}</span>
          <span className="text-xs font-bold text-blueberry-600" title="Preço em pontos">
            {formatPontos(produto.precoEmPontos)}
          </span>
        </div>
        {footer}
      </div>
    </div>
  );
}
