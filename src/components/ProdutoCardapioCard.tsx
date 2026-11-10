import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { ProdutoCardapio } from '@/types';
import { SEM_VALOR, formatBRL, formatPontos } from '@/lib/format';
import { ProdutoImagem } from './ui/ProdutoImagem';

// Card do cardápio público: abre o detalhe e adiciona ao carrinho. Esgotado não adiciona.
export function ProdutoCardapioCard({
  produto,
  categoria,
  onAdicionar,
}: {
  produto: ProdutoCardapio;
  categoria: string;
  onAdicionar: (produto: ProdutoCardapio) => void;
}) {
  return (
    <div className="card flex flex-col overflow-hidden p-0" data-testid="produto-card">
      <Link to={`/produto/${produto.id}`} className="relative block h-32 w-full overflow-hidden bg-cream-100 sm:h-36">
        <ProdutoImagem
          src={produto.imagemUrl}
          alt={produto.descricao}
          className={`h-full w-full ${produto.esgotado ? 'opacity-50 grayscale' : ''}`}
        />
        {produto.esgotado && (
          <span className="badge absolute right-2 top-2 bg-slate-800/80 text-white">Esgotado</span>
        )}
        <span
          className="badge absolute left-2 top-2 bg-strawberry-500 text-white"
          title="Pontos ganhos na compra"
        >
          {produto.ganhoDePontos === null ? SEM_VALOR : `+${formatPontos(produto.ganhoDePontos)}`}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{categoria}</p>
        <Link to={`/produto/${produto.id}`} className="hover:underline">
          <h3 className="font-bold leading-snug text-slate-800">{produto.descricao}</h3>
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-base font-bold text-slate-800 sm:text-lg">
            {formatBRL(produto.preco)}
          </span>
          <button
            type="button"
            className="btn-primary h-9 px-3"
            disabled={produto.esgotado}
            onClick={() => onAdicionar(produto)}
            aria-label={
              produto.esgotado
                ? `${produto.descricao} esgotado`
                : `Adicionar ${produto.descricao} ao carrinho`
            }
          >
            {produto.esgotado ? (
              'Esgotado'
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Adicionar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
