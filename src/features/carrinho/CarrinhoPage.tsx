import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingCart, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState } from '@/components/ui/Misc';
import { ProdutoImagem } from '@/components/ui/ProdutoImagem';
import { Spinner } from '@/components/ui/Loaders';
import { LojaStatus } from '@/components/LojaStatus';
import { AvisosCarrinho } from '@/components/AvisosCarrinho';
import { QuantidadeControle } from '@/components/QuantidadeControle';
import { useAuth } from '@/context/AuthContext';
import { useCarrinho } from '@/context/CarrinhoContext';
import { useLoja } from '@/hooks/useLoja';
import { useRevalidarCarrinho } from '@/hooks/useRevalidarCarrinho';
import { MAX_OBSERVACAO_ITEM, pontosDe, subtotalDe } from '@/lib/carrinho';
import { formatBRL, formatPontos } from '@/lib/format';

// Carrinho (público, guardado no navegador). Ao abrir, confere tudo com o cardápio da API.
export default function CarrinhoPage() {
  const carrinho = useCarrinho();
  const { isAuthenticated } = useAuth();
  const { loja } = useLoja();
  const { avisos, bloqueado, conferindo, erro, conferir } = useRevalidarCarrinho();
  const navigate = useNavigate();

  if (carrinho.itens.length === 0) {
    return (
      <>
        <PageHeader title="Carrinho" />
        <EmptyState
          icon={<ShoppingCart className="h-10 w-10" />}
          title="Seu carrinho está vazio"
          description="Escolha seus sabores no catálogo."
          action={
            <Link to="/catalogo" className="btn-primary">
              Ver o catálogo
            </Link>
          }
        />
      </>
    );
  }

  const subtotal = subtotalDe(carrinho.itens);
  const pontos = pontosDe(carrinho.itens);
  const problema = (produtoId: number) =>
    avisos.find((a) => a.produtoId === produtoId && a.tipo !== 'PRECO');

  return (
    <div className="mx-auto max-w-3xl pb-28 md:pb-0">
      <PageHeader title="Carrinho" subtitle="Confira os itens antes de finalizar." />

      <div className="space-y-4">
        {loja && <LojaStatus loja={loja} />}
        <AvisosCarrinho avisos={avisos} />
        {erro && <ErrorState message={erro} onRetry={() => void conferir()} />}

        <ul className="card divide-y divide-cream-100 p-0">
          {carrinho.itens.map((item) => {
            const indisponivel = problema(item.produtoId);
            return (
              <li key={item.produtoId} className="flex gap-3 p-4" data-testid="item-carrinho">
                <ProdutoImagem
                  src={item.imagemUrl}
                  alt={item.descricao}
                  className={`h-16 w-16 shrink-0 rounded-xl ${indisponivel ? 'opacity-50 grayscale' : ''}`}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800">{item.descricao}</p>
                      <p className="text-xs text-slate-400">
                        {formatBRL(item.preco)} cada
                        {indisponivel && (
                          <span className="ml-2 font-bold text-strawberry-600">
                            {indisponivel.tipo === 'ESGOTADO' ? 'Esgotado' : 'Indisponível'}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full p-2 text-slate-400 hover:bg-cream-100 hover:text-strawberry-600"
                      aria-label={`Remover ${item.descricao}`}
                      onClick={() => carrinho.remover(item.produtoId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <QuantidadeControle
                      valor={item.quantidade}
                      rotulo={item.descricao}
                      onChange={(q) => carrinho.alterarQuantidade(item.produtoId, q)}
                    />
                    <span className="font-bold text-slate-800">
                      {formatBRL(item.preco * item.quantidade)}
                    </span>
                  </div>
                  <input
                    className="input py-2 text-xs"
                    placeholder="Observação (ex.: sem cobertura)"
                    aria-label={`Observação para ${item.descricao}`}
                    maxLength={MAX_OBSERVACAO_ITEM}
                    value={item.observacao}
                    onChange={(e) => carrinho.alterarObservacao(item.produtoId, e.target.value)}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <Link to="/catalogo" className="inline-block text-sm font-bold text-blueberry-500 hover:underline">
          + Adicionar mais itens
        </Link>
      </div>

      {/* Rodapé fixo no celular; card normal no desktop. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-200 bg-white/95 p-3 backdrop-blur md:static md:mt-6 md:rounded-2xl md:border md:p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="text-lg font-bold text-slate-800" data-testid="subtotal-carrinho">
              {formatBRL(subtotal)}
            </span>
          </div>
          {pontos > 0 && (
            <p className="text-xs font-bold text-strawberry-600">
              Este pedido rende {formatPontos(pontos)} quando for concluído.
            </p>
          )}
          <button
            type="button"
            className="btn-primary w-full"
            disabled={bloqueado || conferindo}
            onClick={() => navigate('/checkout')}
          >
            {conferindo ? <Spinner className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            {isAuthenticated ? 'Continuar' : 'Entrar e finalizar'}
          </button>
          {bloqueado && (
            <p className="text-center text-xs text-strawberry-600">
              Remova os itens indisponíveis para continuar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
