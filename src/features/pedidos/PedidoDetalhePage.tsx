import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CreditCard,
  MapPin,
  Package,
  Store,
  Truck,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CardSkeleton } from '@/components/ui/Loaders';
import { ErrorState, StatusPedidoBadge, STATUS_LABEL } from '@/components/ui/Misc';
import { pedidoService } from '@/api/pedidoService';
import type { FormaPagamento, Pedido, StatusPedido } from '@/types';
import { extractErrorMessage, formatBRL, formatDataHora } from '@/lib/format';

// Fluxo de status para desenhar a linha do tempo de acompanhamento.
const FLUXO: StatusPedido[] = ['RECEBIDO', 'EM_PREPARO', 'SAIU_PARA_ENTREGA', 'ENTREGUE'];

const PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  CARTAO: 'Cartão',
  DINHEIRO: 'Dinheiro',
  PONTOS: 'Pontos',
};

// Polling: atualiza o pedido periodicamente. Preparado para troca por WebSocket futuramente.
const POLL_MS = 15_000;

export default function PedidoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const buscar = (initial = false) => {
      if (initial) setLoading(true);
      pedidoService
        .get(Number(id))
        .then((p) => active && setPedido(p))
        .catch((e) => active && setError(extractErrorMessage(e)))
        .finally(() => active && initial && setLoading(false));
    };

    buscar(true);
    const timer = setInterval(() => buscar(false), POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <CardSkeleton />
      </div>
    );
  }

  if (error || !pedido) {
    return <ErrorState message={error ?? 'Pedido não encontrado.'} />;
  }

  const cancelado = pedido.status === 'CANCELADO';
  const stepAtual = FLUXO.indexOf(pedido.status);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/pedidos"
        className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-blueberry-500 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos pedidos
      </Link>

      <PageHeader
        title={`Pedido #${pedido.id}`}
        subtitle={formatDataHora(pedido.data)}
        action={<StatusPedidoBadge status={pedido.status} />}
      />

      {/* Linha do tempo de acompanhamento */}
      <section className="card mb-6">
        <h2 className="mb-5 flex items-center gap-2 font-bold text-slate-800">
          <Package className="h-5 w-5 text-blueberry-600" /> Acompanhamento
        </h2>
        {cancelado ? (
          <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
            Este pedido foi cancelado.
          </p>
        ) : (
          <ol className="flex items-center">
            {FLUXO.map((step, i) => {
              const done = i <= stepAtual;
              const isLast = i === FLUXO.length - 1;
              return (
                <li key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                        done ? 'bg-mint-500 text-white' : 'bg-cream-200 text-slate-400'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                    <span
                      className={`mt-2 w-20 text-center text-[10px] font-bold sm:text-xs ${
                        done ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {STATUS_LABEL[step]}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`-mt-6 h-1 flex-1 rounded-full ${
                        i < stepAtual ? 'bg-mint-500' : 'bg-cream-200'
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-4 text-xs text-slate-400">
          Atualiza automaticamente a cada 15s (pronto para WebSocket).
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Itens */}
        <section className="card md:col-span-3">
          <h2 className="mb-4 font-bold text-slate-800">Itens</h2>
          <ul className="divide-y divide-cream-100">
            {pedido.itens.map((item) => (
              <li key={item.produtoId} className="flex items-center gap-3 py-3">
                <img
                  src={item.imagemUrl}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">{item.descricao}</p>
                  <p className="text-xs text-slate-400">
                    {item.quantidade} × {formatBRL(item.valorUnitario)}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-700">
                  {formatBRL(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1 border-t border-cream-200 pt-4 text-sm">
            <Linha label="Subtotal" value={formatBRL(pedido.subtotal)} />
            <Linha
              label="Frete"
              value={pedido.frete === 0 ? 'Grátis' : formatBRL(pedido.frete)}
            />
            <div className="flex justify-between pt-2 text-base font-bold text-slate-800">
              <dt>Total</dt>
              <dd>{formatBRL(pedido.total)}</dd>
            </div>
          </dl>
        </section>

        {/* Entrega + pagamento */}
        <section className="space-y-6 md:col-span-2">
          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
              {pedido.tipoEntrega === 'ENTREGA' ? (
                <Truck className="h-5 w-5 text-blueberry-600" />
              ) : (
                <Store className="h-5 w-5 text-blueberry-600" />
              )}
              {pedido.tipoEntrega === 'ENTREGA' ? 'Entrega' : 'Retirada na loja'}
            </h3>
            {pedido.tipoEntrega === 'ENTREGA' && pedido.endereco ? (
              <div className="flex gap-2 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {pedido.endereco.rua}, {pedido.endereco.numero}
                  {pedido.endereco.complemento ? ` — ${pedido.endereco.complemento}` : ''}
                  <br />
                  {pedido.endereco.bairro}, {pedido.endereco.cidade}
                  <br />
                  CEP {pedido.endereco.cep}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Retirar no balcão da loja Cremoso.</p>
            )}
          </div>

          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <CreditCard className="h-5 w-5 text-blueberry-600" /> Pagamento
            </h3>
            <p className="text-sm text-slate-600">{PAGAMENTO_LABEL[pedido.formaPagamento]}</p>
            <p className="mt-2 text-xs font-bold text-blueberry-500">
              +{pedido.pontosGanhos} pontos neste pedido
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-500">
      <dt>{label}</dt>
      <dd className="font-semibold text-slate-700">{value}</dd>
    </div>
  );
}
