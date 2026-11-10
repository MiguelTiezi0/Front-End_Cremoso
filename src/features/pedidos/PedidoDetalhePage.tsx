import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  MapPin,
  MessageCircle,
  Package,
  QrCode,
  Store,
  Truck,
  Undo2,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CardSkeleton } from '@/components/ui/Loaders';
import { ErrorState, StatusPedidoBadge } from '@/components/ui/Misc';
import { ProdutoImagem } from '@/components/ui/ProdutoImagem';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PixPagamento } from '@/components/PixPagamento';
import { pedidoService } from '@/api/pedidoService';
import { useToast } from '@/context/ToastContext';
import { useLoja } from '@/hooks/useLoja';
import {
  MSG_PIX_EXPIRADO,
  STATUS_DESCRICAO,
  STATUS_LABEL,
  etapasDoPedido,
  pixExpirado,
} from '@/lib/statusPedido';
import { linkWhatsApp } from '@/lib/loja';
import type { Pedido } from '@/types';
import { extractErrorMessage, formatBRL, formatDataHora, formatPontos } from '@/lib/format';
import { proximoIntervalo } from '@/lib/polling';

// Polling: atualiza o pedido a cada 15s (status, confirmação do Pix, devolução). Depois de
// um erro, espaça as tentativas com o backoff de src/lib/polling.ts. Continua mesmo com o
// pedido cancelado: um Pix vencido pode ser confirmado pela loja em até 2 h e o pedido
// volta para o fluxo; a tela mostra isso sem o cliente recarregar.
const POLL_MS = 15_000;

const hora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(iso));

export default function PedidoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { loja } = useLoja();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const atualizarAgora = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!id) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let intervalo = POLL_MS;

    const ciclo = () => {
      clearTimeout(timer);
      pedidoService
        .get(Number(id))
        .then((p) => {
          if (!active) return;
          setPedido(p);
          setError(null);
          intervalo = proximoIntervalo(true, intervalo, POLL_MS);
        })
        .catch((e) => {
          if (!active) return;
          setError(extractErrorMessage(e));
          intervalo = proximoIntervalo(false, intervalo, POLL_MS);
        })
        .finally(() => {
          if (!active) return;
          setLoading(false);
          timer = setTimeout(ciclo, intervalo);
        });
    };

    atualizarAgora.current = ciclo;
    ciclo();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);

  const aoExpirarPix = useCallback(() => atualizarAgora.current(), []);

  const cancelar = async () => {
    if (!pedido) return;
    try {
      setPedido(await pedidoService.cancelar(pedido.id));
      toast.success('Pedido cancelado.');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Não foi possível cancelar o pedido.'));
      atualizarAgora.current();
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <CardSkeleton />
      </div>
    );
  }

  // Erro só derruba a tela se ainda não há pedido; com pedido na tela, o polling tenta de novo.
  if (!pedido) {
    return <ErrorState message={error ?? 'Pedido não encontrado.'} />;
  }

  const cancelado = pedido.status === 'CANCELADO';
  const expirado = pixExpirado(pedido);
  const whatsapp = loja?.whatsapp
    ? linkWhatsApp(loja.whatsapp, `Olá! Quero falar sobre o meu pedido #${pedido.id} no app da Cremoso.`)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to="/pedidos"
        className="inline-flex items-center gap-1 text-sm font-bold text-blueberry-500 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Meus pedidos
      </Link>

      <PageHeader
        title={`Pedido #${pedido.id}`}
        subtitle={formatDataHora(pedido.data)}
        action={<StatusPedidoBadge status={pedido.status} />}
      />

      {error && (
        <p className="rounded-xl bg-cream-200 px-4 py-2 text-xs text-slate-500">
          Sem conexão agora. Os dados podem estar desatualizados; tentando de novo…
        </p>
      )}

      <AvisoPagamento pedido={pedido} expirado={expirado} />

      {/* Pix pendente */}
      {pedido.pix && !cancelado && (
        <section className="card p-4 sm:p-6" aria-label="Pagamento Pix">
          <PixPagamento pix={pedido.pix} onExpirou={aoExpirarPix} />
        </section>
      )}

      {/* Acompanhamento */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 font-bold text-slate-800">
          <Package className="h-5 w-5 text-blueberry-600" /> Acompanhamento
        </h2>
        <p className="mb-4 text-sm text-slate-500" data-testid="descricao-status">
          {expirado ? MSG_PIX_EXPIRADO : STATUS_DESCRICAO[pedido.status]}
        </p>
        {cancelado ? (
          <Cancelamento pedido={pedido} expirado={expirado} />
        ) : (
          <LinhaDoTempo pedido={pedido} />
        )}
        <p className="mt-4 text-xs text-slate-400">Esta tela se atualiza sozinha.</p>
      </section>

      <div className="grid gap-5 md:grid-cols-5">
        {/* Itens */}
        <section className="card p-4 sm:p-6 md:col-span-3">
          <h2 className="mb-3 font-bold text-slate-800">Itens</h2>
          <ul className="divide-y divide-cream-100">
            {pedido.itens.map((item) => (
              <li key={item.produtoId} className="flex items-center gap-3 py-3">
                <ProdutoImagem src={item.imagemUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-700">{item.descricao}</p>
                  <p className="text-xs text-slate-400">
                    {item.quantidade} × {formatBRL(item.valorUnitario)}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-700">{formatBRL(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-cream-200 pt-3 text-sm">
            <Linha label="Subtotal" value={formatBRL(pedido.subtotal)} />
            <Linha
              label="Taxa de entrega"
              value={pedido.tipoEntrega === 'RETIRADA' ? 'Retirada' : formatBRL(pedido.frete)}
            />
            <div className="flex justify-between pt-2 text-base font-bold text-slate-800">
              <dt>Total</dt>
              <dd>{formatBRL(pedido.total)}</dd>
            </div>
          </dl>
          {pedido.pontosGanhos > 0 && (
            <p className="mt-2 text-xs font-bold text-strawberry-600">
              {pedido.pontosCreditados
                ? `${formatPontos(pedido.pontosGanhos)} creditados no seu saldo.`
                : cancelado
                  ? 'Pedido cancelado: não rende pontos.'
                  : `Rende ${formatPontos(pedido.pontosGanhos)} quando for concluído.`}
            </p>
          )}
        </section>

        {/* Entrega, pagamento e ações */}
        <section className="space-y-5 md:col-span-2">
          <div className="card p-4 sm:p-6">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
              {pedido.tipoEntrega === 'ENTREGA' ? (
                <Truck className="h-5 w-5 text-blueberry-600" />
              ) : (
                <Store className="h-5 w-5 text-blueberry-600" />
              )}
              {pedido.tipoEntrega === 'ENTREGA' ? 'Entrega' : 'Retirada na loja'}
            </h3>
            {pedido.endereco ? (
              <p className="flex gap-2 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                  {pedido.endereco.rua}, {pedido.endereco.numero}
                  {pedido.endereco.complemento ? ` — ${pedido.endereco.complemento}` : ''}
                  <br />
                  {pedido.endereco.bairro}, {pedido.endereco.cidade} · CEP {pedido.endereco.cep}
                  {pedido.endereco.referencia && (
                    <>
                      <br />
                      Ref.: {pedido.endereco.referencia}
                    </>
                  )}
                </span>
              </p>
            ) : (
              <p className="text-sm text-slate-600">Retire no balcão da loja Cremoso.</p>
            )}
            {pedido.observacao && (
              <p className="mt-3 whitespace-pre-line rounded-xl bg-cream-100 px-3 py-2 text-xs text-slate-600">
                {pedido.observacao}
              </p>
            )}
          </div>

          <div className="card p-4 sm:p-6">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
              <QrCode className="h-5 w-5 text-blueberry-600" /> Pagamento
            </h3>
            <p className="text-sm text-slate-600" data-testid="status-pagamento">
              Pix · {ROTULO_PAGAMENTO[pedido.statusPagamento]}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
                <MessageCircle className="h-4 w-4" /> Falar com a loja no WhatsApp
              </a>
            )}
            {pedido.podeCancelar && (
              <button type="button" className="btn-danger w-full" onClick={() => setCancelando(true)}>
                <XCircle className="h-4 w-4" /> Cancelar pedido
              </button>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={cancelando}
        title="Cancelar pedido"
        message={
          pedido.statusPagamento === 'CONFIRMADO'
            ? `Cancelar o pedido #${pedido.id}? Seu pagamento já foi confirmado: a loja vai devolver o valor pelo Pix.`
            : `Cancelar o pedido #${pedido.id}? Se você já pagou o Pix, a loja devolve o valor.`
        }
        confirmLabel="Cancelar pedido"
        onConfirm={cancelar}
        onCancel={() => setCancelando(false)}
      />
    </div>
  );
}

const ROTULO_PAGAMENTO: Record<Pedido['statusPagamento'], string> = {
  PENDENTE: 'aguardando pagamento',
  CONFIRMADO: 'pagamento confirmado',
  DEVOLVIDO: 'pagamento devolvido',
};

// Faixa de destaque sobre o pagamento: Pix expirado, devolução feita ou a fazer.
function AvisoPagamento({ pedido, expirado }: { pedido: Pedido; expirado: boolean }) {
  if (pedido.statusPagamento === 'DEVOLVIDO') {
    return (
      <div role="status" className="flex gap-3 rounded-2xl border border-mint-300 bg-mint-100 px-4 py-3 text-sm text-mint-600">
        <Undo2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">Pagamento devolvido</p>
          <p>A loja devolveu {formatBRL(pedido.total)} para você pelo Pix.</p>
        </div>
      </div>
    );
  }
  if (pedido.status === 'CANCELADO' && pedido.statusPagamento === 'CONFIRMADO') {
    return (
      <div role="status" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Undo2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">Devolução a caminho</p>
          <p>Seu pagamento foi confirmado e a loja vai devolver {formatBRL(pedido.total)} pelo Pix.</p>
        </div>
      </div>
    );
  }
  if (expirado) {
    return (
      <div role="status" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{MSG_PIX_EXPIRADO}</p>
      </div>
    );
  }
  return null;
}

function Cancelamento({ pedido, expirado }: { pedido: Pedido; expirado: boolean }) {
  const quem =
    pedido.canceladoPor === 'CLIENTE'
      ? 'Você cancelou este pedido.'
      : expirado
        ? 'O Pix não foi pago em 15 minutos e o pedido foi cancelado automaticamente.'
        : 'A loja cancelou este pedido.';
  const quando = pedido.historico.find((h) => h.status === 'CANCELADO')?.em;
  return (
    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
      <p className="font-semibold">{quem}</p>
      {pedido.canceladoPor === 'LOJA' && pedido.motivoCancelamento && (
        <p className="mt-1">Motivo: {pedido.motivoCancelamento}</p>
      )}
      {quando && <p className="mt-1 text-xs text-slate-400">{formatDataHora(quando)}</p>}
    </div>
  );
}

// Linha do tempo vertical (cabe no celular). Os horários vêm do histórico da API.
function LinhaDoTempo({ pedido }: { pedido: Pedido }) {
  const etapas = etapasDoPedido(pedido.tipoEntrega);
  const atual = etapas.indexOf(pedido.status);
  const quando = (status: Pedido['status']) =>
    [...pedido.historico].reverse().find((h) => h.status === status)?.em;

  return (
    <ol className="space-y-0">
      {etapas.map((etapa, i) => {
        const feita = i <= atual;
        const em = feita ? quando(etapa) : undefined;
        return (
          <li key={etapa} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  feita ? 'bg-mint-500 text-white' : 'bg-cream-200 text-slate-400'
                } ${i === atual ? 'ring-4 ring-mint-100' : ''}`}
              >
                <Check className="h-4 w-4" />
              </span>
              {i < etapas.length - 1 && (
                <span className={`my-1 w-0.5 flex-1 ${i < atual ? 'bg-mint-500' : 'bg-cream-200'}`} />
              )}
            </div>
            <div className="pb-5">
              <p
                className={`text-sm font-bold ${feita ? 'text-slate-800' : 'text-slate-400'}`}
                aria-current={i === atual ? 'step' : undefined}
              >
                {STATUS_LABEL[etapa]}
              </p>
              {em && <p className="text-xs text-slate-400">{hora(em)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
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
