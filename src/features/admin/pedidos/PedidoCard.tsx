import { useState } from 'react';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock,
  MessageCircle,
  Printer,
  RotateCcw,
  Store,
  XCircle,
} from 'lucide-react';
import type { PedidoAdmin } from '@/types';
import { adminPedidoService } from '@/api/adminService';
import { StatusPedidoBadge } from '@/components/ui/Misc';
import { Spinner } from '@/components/ui/Loaders';
import { useToast } from '@/context/ToastContext';
import { extractErrorMessage, formatBRL, statusHttp } from '@/lib/format';
import { linkWhatsApp } from '@/lib/loja';
import {
  MOTIVOS_CANCELAMENTO,
  ROTULO_PAGAMENTO,
  acoesDoPedido,
  horaDe,
  mensagemParaCliente,
  pixTardioAberto,
  precisaDevolver,
  tempoAte,
  tempoDesde,
  type Acao,
} from '@/lib/painel';
import { STATUS_LABEL } from '@/lib/statusPedido';

type Modo = null | 'pagamento' | 'cancelar' | 'devolver';

const PAGAMENTO_ESTILO: Record<PedidoAdmin['statusPagamento'], string> = {
  PENDENTE: 'bg-amber-100 text-amber-800',
  CONFIRMADO: 'bg-mint-100 text-mint-700',
  DEVOLVIDO: 'bg-slate-100 text-slate-600',
};

// Um pedido no painel do balcão: tudo que a loja precisa ver e botões grandes só para o
// que a API permite agora. Confirmar pagamento, cancelar e devolver pedem confirmação aqui
// mesmo (sem janela do navegador).
export function PedidoCard({
  pedido: p,
  agora,
  novo = false,
  nomeLoja,
  onAtualizado,
  onRecarregar,
  onImprimir,
}: {
  pedido: PedidoAdmin;
  agora: number;
  novo?: boolean;
  nomeLoja?: string;
  onAtualizado: (p: PedidoAdmin) => void;
  onRecarregar: () => void;
  onImprimir: (p: PedidoAdmin) => void;
}) {
  const toast = useToast();
  const [modo, setModo] = useState<Modo>(null);
  const [motivo, setMotivo] = useState('');
  const [outroMotivo, setOutroMotivo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const acoes = acoesDoPedido(p, agora);
  const ativo = !['CONCLUIDO', 'CANCELADO'].includes(p.status);
  const whatsapp = linkWhatsApp(p.cliente.telefone, mensagemParaCliente(p, nomeLoja));
  const tardio = pixTardioAberto(p, agora);
  const devolver = precisaDevolver(p);

  const executar = async (acao: () => Promise<PedidoAdmin>, sucesso: string) => {
    if (enviando) return;
    setEnviando(true);
    try {
      const atualizado = await acao();
      onAtualizado(atualizado);
      setModo(null);
      setMotivo('');
      setOutroMotivo(false);
      toast.success(sucesso);
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Não foi possível atualizar o pedido.'));
      // 409: outro aparelho mexeu antes ou o Pix venceu; a fila é recarregada.
      if (statusHttp(e) === 409) onRecarregar();
    } finally {
      setEnviando(false);
    }
  };

  const clicar = (acao: Acao) => {
    if (acao.tipo === 'status') {
      void executar(
        () => adminPedidoService.mudarStatus(p.id, p.status, acao.para),
        `Pedido #${p.id}: ${STATUS_LABEL[acao.para]}.`,
      );
    } else if (acao.tipo === 'pagamento') {
      setModo('pagamento');
    } else if (acao.tipo === 'cancelar') {
      setModo('cancelar');
    } else {
      setModo('devolver');
    }
  };

  const confirmarPagamento = () =>
    executar(
      () => adminPedidoService.pagamento(p.id, 'CONFIRMADO'),
      tardio ? `Pix confirmado: o pedido #${p.id} voltou para a fila.` : `Pix do pedido #${p.id} confirmado.`,
    );
  const cancelar = () =>
    executar(
      () => adminPedidoService.mudarStatus(p.id, p.status, 'CANCELADO', motivo.trim()),
      `Pedido #${p.id} cancelado.`,
    );
  const marcarDevolvido = () =>
    executar(() => adminPedidoService.pagamento(p.id, 'DEVOLVIDO'), `Pedido #${p.id}: pagamento devolvido.`);

  const principal = acoes[0];
  const secundarias = acoes.slice(1);
  // ACEITO com Pix pendente: deixa claro por que não dá para começar o preparo.
  const preparoBloqueado = p.status === 'ACEITO' && p.statusPagamento === 'PENDENTE';

  return (
    <article
      aria-label={`Pedido #${p.id}`}
      className={`card space-y-3 p-4 ${
        novo ? 'border-strawberry-300 ring-4 ring-strawberry-200' : devolver || tardio ? 'border-amber-300' : ''
      }`}
    >
      {/* Cabeçalho: número, hora, espera */}
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-2xl font-extrabold text-slate-800">
            #{p.id}
            {novo && (
              <span className="badge animate-pulse bg-strawberry-500 text-white">NOVO</span>
            )}
          </p>
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <Clock className="h-4 w-4" /> {horaDe(p.data)}
            {ativo && (
              <span className="font-semibold text-slate-700" data-testid="espera">
                · {tempoDesde(p.data, agora)}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <StatusPedidoBadge status={p.status} />
          <span className={`badge ${PAGAMENTO_ESTILO[p.statusPagamento]}`} data-testid="pagamento-painel">
            {ROTULO_PAGAMENTO[p.statusPagamento]}
          </span>
        </div>
      </header>

      {/* Cliente e entrega */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          <span className="font-bold text-slate-800">{p.cliente.nome}</span>{' '}
          <span className="text-slate-500">{p.cliente.telefone}</span>
        </p>
        <span className="badge bg-blueberry-50 text-blueberry-700">
          {p.tipoEntrega === 'ENTREGA' ? <Bike className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
          {p.tipoEntrega === 'ENTREGA' ? 'Entrega' : 'Retirada'}
        </span>
      </div>
      {p.endereco && (
        <p className="rounded-xl bg-cream-100 px-3 py-2 text-sm text-slate-600">
          {p.endereco.rua}, {p.endereco.numero}
          {p.endereco.complemento ? ` — ${p.endereco.complemento}` : ''} · {p.endereco.bairro} · CEP{' '}
          {p.endereco.cep}
          {p.endereco.referencia ? ` · Ref.: ${p.endereco.referencia}` : ''}
        </p>
      )}

      {/* Itens */}
      <ul className="space-y-1 border-y border-cream-100 py-2">
        {p.itens.map((i) => (
          <li key={i.produtoId} className="text-base">
            <span className="font-bold text-slate-800">{i.quantidade}×</span> {i.descricao}
            {i.observacao && (
              <span className="mt-0.5 block rounded-lg bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-800">
                Obs.: {i.observacao}
              </span>
            )}
          </li>
        ))}
      </ul>
      {p.observacao && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Observação: {p.observacao}
        </p>
      )}
      <p className="flex justify-between text-lg font-bold text-slate-800">
        <span>Total</span>
        <span>{formatBRL(p.total)}</span>
      </p>

      {p.status === 'CANCELADO' && p.motivoCancelamento && !tardio && (
        <p className="text-sm text-slate-500">
          Motivo: {p.motivoCancelamento === 'PIX_EXPIRADO' ? 'Pix não pago em 15 minutos' : p.motivoCancelamento}
        </p>
      )}

      {/* Avisos que pedem ação */}
      {devolver && (
        <p role="status" className="flex gap-2 rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">
          <RotateCcw className="h-5 w-5 shrink-0" />
          Devolver ao cliente: {formatBRL(p.total)} pelo Pix. Depois marque como DEVOLVIDO.
        </p>
      )}
      {tardio && p.confirmarPagamentoAte && (
        <p role="status" className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900">
          Pix vencido. Se o cliente pagou, confirme até{' '}
          <span className="text-lg" data-testid="prazo-pix">
            {horaDe(p.confirmarPagamentoAte)}
          </span>{' '}
          ({tempoAte(p.confirmarPagamentoAte, agora)}). Depois disso, só devolvendo.
        </p>
      )}

      {/* Confirmações dentro do card */}
      {modo === 'pagamento' && (
        <div className="space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3" role="group" aria-label="Confirmar pagamento">
          <p className="flex gap-2 font-bold text-amber-900">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Confira no extrato do banco antes de confirmar.
          </p>
          <p className="text-sm text-amber-900">
            Procure um Pix de <strong>{formatBRL(p.total)}</strong> de {p.cliente.nome}.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-primary py-4 text-base" disabled={enviando} onClick={confirmarPagamento}>
              {enviando ? <Spinner className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              Sim, o Pix caiu
            </button>
            <button type="button" className="btn-ghost py-4 text-base" disabled={enviando} onClick={() => setModo(null)}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {modo === 'devolver' && (
        <div className="space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3" role="group" aria-label="Marcar como devolvido">
          <p className="font-bold text-amber-900">
            Você já devolveu {formatBRL(p.total)} para {p.cliente.nome} pelo Pix?
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-primary py-4 text-base" disabled={enviando} onClick={marcarDevolvido}>
              {enviando ? <Spinner className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              Sim, já devolvi
            </button>
            <button type="button" className="btn-ghost py-4 text-base" disabled={enviando} onClick={() => setModo(null)}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {modo === 'cancelar' && (
        <div className="space-y-3 rounded-2xl border-2 border-strawberry-200 bg-strawberry-100/40 p-3" role="group" aria-label="Cancelar pedido">
          <p className="font-bold text-strawberry-700">Por que cancelar o pedido #{p.id}?</p>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS_CANCELAMENTO.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={!outroMotivo && motivo === m}
                onClick={() => {
                  setOutroMotivo(false);
                  setMotivo(m);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
                  !outroMotivo && motivo === m
                    ? 'bg-strawberry-500 text-white ring-strawberry-500'
                    : 'bg-white text-slate-600 ring-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={outroMotivo}
              onClick={() => {
                setOutroMotivo(true);
                setMotivo('');
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
                outroMotivo ? 'bg-strawberry-500 text-white ring-strawberry-500' : 'bg-white text-slate-600 ring-slate-200'
              }`}
            >
              Outro motivo
            </button>
          </div>
          {outroMotivo && (
            <input
              className="input"
              aria-label="Motivo do cancelamento"
              placeholder="Escreva o motivo"
              maxLength={255}
              value={motivo}
              autoFocus
              onChange={(e) => setMotivo(e.target.value)}
            />
          )}
          {p.statusPagamento === 'CONFIRMADO' && (
            <p className="text-sm font-semibold text-strawberry-700">
              O Pix deste pedido já foi confirmado: depois de cancelar, devolva {formatBRL(p.total)} ao cliente.
            </p>
          )}
          {p.status === 'CONCLUIDO' && (
            <p className="text-sm font-semibold text-strawberry-700">
              O pedido já foi concluído: os pontos que o cliente ganhou serão estornados.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="btn bg-strawberry-500 py-4 text-base text-white hover:bg-strawberry-600 focus:ring-strawberry-300"
              disabled={enviando || !motivo.trim()}
              onClick={cancelar}
            >
              {enviando ? <Spinner className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              Confirmar cancelamento
            </button>
            <button type="button" className="btn-ghost py-4 text-base" disabled={enviando} onClick={() => setModo(null)}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      {modo === null && acoes.length > 0 && (
        <div className="space-y-2">
          {principal && principal.tipo !== 'cancelar' && (
            <button
              type="button"
              className="btn-primary w-full py-4 text-lg"
              disabled={enviando}
              onClick={() => clicar(principal)}
            >
              {enviando && <Spinner className="h-5 w-5" />}
              {principal.tipo === 'devolver' ? 'Marcar como DEVOLVIDO' : principal.rotulo}
            </button>
          )}
          {principal?.tipo === 'pagamento' && (
            <p className="text-center text-xs font-semibold text-amber-800">
              Confira no extrato do banco antes de confirmar.
            </p>
          )}
          {preparoBloqueado && (
            <>
              <button type="button" className="btn-ghost w-full py-3 text-base" disabled>
                Começar preparo
              </button>
              <p className="text-center text-xs text-slate-500">
                O preparo só começa com o Pix confirmado.
              </p>
            </>
          )}
          {[...(principal?.tipo === 'cancelar' ? [principal] : []), ...secundarias].map((a) => (
            <button
              key={a.tipo === 'status' ? a.para : a.tipo}
              type="button"
              className={a.tipo === 'cancelar' ? 'btn-danger w-full py-3 text-base' : 'btn-secondary w-full py-3 text-base'}
              disabled={enviando}
              onClick={() => clicar(a)}
            >
              {a.tipo === 'devolver' ? 'Marcar como DEVOLVIDO' : a.rotulo}
            </button>
          ))}
        </div>
      )}

      {/* Contato e comanda */}
      <footer className="grid grid-cols-2 gap-2">
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-ghost py-3">
            <MessageCircle className="h-4 w-4 shrink-0 text-mint-600" /> Avisar cliente no WhatsApp
          </a>
        ) : (
          <span className="btn-ghost py-3 opacity-60">Sem WhatsApp</span>
        )}
        <button type="button" className="btn-ghost py-3" onClick={() => onImprimir(p)}>
          <Printer className="h-4 w-4" /> Imprimir comanda
        </button>
      </footer>
    </article>
  );
}
