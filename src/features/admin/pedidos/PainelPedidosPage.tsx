import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { BellOff, BellRing, RefreshCw, Sun, SunDim, Volume2, WifiOff } from 'lucide-react';
import type { PedidoAdmin } from '@/types';
import { FILA_DO_PAINEL, adminPedidoService } from '@/api/adminService';
import { PageHeader } from '@/components/ui/PageHeader';
import { CardSkeleton } from '@/components/ui/Loaders';
import { EmptyState } from '@/components/ui/Misc';
import { useLoja } from '@/hooks/useLoja';
import { useSomPedidos } from '@/hooks/useSomPedidos';
import { useWakeLock } from '@/hooks/useWakeLock';
import { extractErrorMessage } from '@/lib/format';
import { dataNoFuso, horaNoFuso } from '@/lib/loja';
import { ABAS, pixTardioAberto, precisaDevolver, type Aba } from '@/lib/painel';
import { proximoIntervalo } from '@/lib/polling';
import { Comanda } from './Comanda';
import { PausaPedidos } from './PausaPedidos';
import { PedidoCard } from './PedidoCard';

const INTERVALO_PAINEL_MS = 10_000;

// Painel do balcão: fila de pedidos atualizada a cada 10 s (com o backoff de
// src/lib/polling.ts quando a conexão falha), som em pedido novo e tela sempre acesa.
// Feito para um celular ou tablet fixo, operado por quem não é técnico: botões grandes,
// avisos em português claro e nada de janelas do navegador.
export default function PainelPedidosPage() {
  const { loja } = useLoja();
  const som = useSomPedidos();
  const tela = useWakeLock();
  const [pedidos, setPedidos] = useState<PedidoAdmin[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [aba, setAba] = useState<Aba>('NOVOS');
  const [recarga, setRecarga] = useState(0);
  const [imprimindo, setImprimindo] = useState<PedidoAdmin | null>(null);
  // Pedidos RECEBIDO já vistos: um id novo aqui toca o som (a primeira carga não toca).
  const vistos = useRef<Set<number> | null>(null);
  const tocar = useRef(som.tocar);
  useEffect(() => {
    tocar.current = som.tocar;
  }, [som.tocar]);

  // Relógio dos tempos de espera e prazos.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let intervalo = INTERVALO_PAINEL_MS;

    const ciclo = async () => {
      let ok = true;
      try {
        // A fila (ativos de qualquer dia + finalizados de hoje) e os cancelados de ontem, para
        // não perder devolução pendente nem Pix vencido perto da meia-noite.
        const ontem = dataNoFuso(new Date(Date.now() - 24 * 60 * 60_000));
        const [fila, canceladosOntem] = await Promise.all([
          adminPedidoService.list({ status: FILA_DO_PAINEL }),
          adminPedidoService.list({ status: ['CANCELADO'], data: ontem }),
        ]);
        if (!ativo) return;
        const lista = [...new Map([...canceladosOntem, ...fila].map((p) => [p.id, p])).values()];
        const recebidos = lista.filter((p) => p.status === 'RECEBIDO').map((p) => p.id);
        if (vistos.current && recebidos.some((id) => !vistos.current?.has(id))) tocar.current();
        vistos.current = new Set([...(vistos.current ?? []), ...recebidos]);
        setPedidos(lista);
        setErro(null);
        setAtualizadoEm(Date.now());
        setAgora(Date.now());
      } catch (e) {
        ok = false;
        if (ativo) setErro(extractErrorMessage(e, 'Sem conexão com o sistema.'));
      }
      intervalo = proximoIntervalo(ok, intervalo, INTERVALO_PAINEL_MS);
      if (ativo) timer = setTimeout(ciclo, intervalo);
    };

    void ciclo();
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [recarga]);

  const recarregar = () => setRecarga((r) => r + 1);

  const atualizado = (p: PedidoAdmin) => {
    setPedidos((lista) => lista?.map((x) => (x.id === p.id ? p : x)) ?? lista);
    recarregar();
  };

  // O toque no botão também serve de gesto para o navegador liberar a tela acesa.
  const ativarSom = () => {
    void tela.pedir();
    void som.ativar();
  };

  const imprimir = (p: PedidoAdmin) => {
    flushSync(() => setImprimindo(p));
    document.body.classList.add('imprimindo');
    const fim = () => {
      document.body.classList.remove('imprimindo');
      window.removeEventListener('afterprint', fim);
    };
    window.addEventListener('afterprint', fim);
    window.print();
  };

  const lista = pedidos ?? [];
  const devolver = lista.filter(precisaDevolver);
  const tardios = lista.filter((p) => pixTardioAberto(p, agora));
  const porAba = (id: Aba) => {
    const status = ABAS.find((a) => a.id === id)?.status ?? [];
    return lista.filter((p) => status.includes(p.status));
  };
  const daAba = porAba(aba);
  // Mais antigos primeiro (fila); concluídos, os últimos primeiro.
  if (aba === 'CONCLUIDOS') daAba.reverse();

  const card = (p: PedidoAdmin) => (
    <PedidoCard
      key={p.id}
      pedido={p}
      agora={agora}
      novo={p.status === 'RECEBIDO'}
      nomeLoja={loja?.nome}
      onAtualizado={atualizado}
      onRecarregar={recarregar}
      onImprimir={imprimir}
    />
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pedidos"
        subtitle="A fila atualiza sozinha a cada 10 segundos."
        action={
          <button type="button" className="btn-ghost" onClick={recarregar}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        }
      />

      <PausaPedidos agora={agora} />

      {/* Som e tela */}
      {som.ativo ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-mint-700">
          <BellRing className="h-4 w-4" /> Som ligado para pedidos novos.
          <button type="button" className="font-semibold underline" onClick={() => som.tocar()}>
            Testar som
          </button>
          <button type="button" className="font-semibold text-slate-500 underline" onClick={som.desativar}>
            Desligar
          </button>
        </div>
      ) : (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <p className="flex flex-1 items-center gap-2 font-bold text-amber-900">
            <BellOff className="h-6 w-6 shrink-0" />
            {som.suportado
              ? 'Som desligado: você não vai ouvir quando chegar pedido novo.'
              : 'Este navegador não toca som. Fique de olho na aba "Novos".'}
          </p>
          {som.suportado && (
            <button type="button" className="btn-primary px-6 py-4 text-lg" onClick={ativarSom}>
              <Volume2 className="h-6 w-6" /> Ativar som
            </button>
          )}
        </div>
      )}
      <p className="flex items-center gap-2 text-xs text-slate-500" data-testid="estado-tela">
        {tela.estado === 'acesa' ? (
          <>
            <Sun className="h-4 w-4 text-amber-500" /> Tela sempre acesa enquanto o painel estiver aberto.
          </>
        ) : tela.estado === 'pedindo' ? (
          <>
            <SunDim className="h-4 w-4" /> Pedindo para manter a tela acesa…
          </>
        ) : (
          <>
            <SunDim className="h-4 w-4" /> Este navegador não deixou manter a tela acesa: aumente o tempo de
            tela nas configurações do aparelho.
          </>
        )}
      </p>

      {erro && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-2xl bg-strawberry-100 px-4 py-3 text-sm font-semibold text-strawberry-700">
          <WifiOff className="h-5 w-5" />
          {erro} Tentando de novo sozinho
          {atualizadoEm ? ` (última atualização às ${horaNoFuso(new Date(atualizadoEm))})` : ''}.
          <button type="button" className="underline" onClick={recarregar}>
            Tentar agora
          </button>
        </div>
      )}

      {pedidos === null && !erro ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* Pendências fora da fila: atalho no topo; as seções ficam depois da fila, para os
              pedidos novos continuarem à vista no celular. */}
          {(tardios.length > 0 || devolver.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {tardios.length > 0 && (
                <a href="#pix-vencido" className="btn bg-amber-100 py-3 text-amber-900 ring-2 ring-amber-300 hover:bg-amber-200">
                  Pix vencido — ainda dá pra confirmar ({tardios.length})
                </a>
              )}
              {devolver.length > 0 && (
                <a href="#devolver" className="btn bg-amber-100 py-3 text-amber-900 ring-2 ring-amber-300 hover:bg-amber-200">
                  Devolver ao cliente ({devolver.length})
                </a>
              )}
            </div>
          )}

          {/* Abas da fila */}
          <div role="tablist" aria-label="Etapas dos pedidos" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {ABAS.map((a) => {
              const qtd = porAba(a.id).length;
              const alerta = a.id === 'NOVOS' && qtd > 0;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={aba === a.id}
                  onClick={() => setAba(a.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
                    aba === a.id
                      ? 'bg-blueberry-500 text-white'
                      : alerta
                        ? 'bg-strawberry-100 text-strawberry-700 ring-2 ring-strawberry-300'
                        : 'bg-white text-slate-600 ring-1 ring-cream-200'
                  }`}
                >
                  {a.titulo}
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs ${
                      alerta ? 'animate-pulse bg-strawberry-500 text-white' : 'bg-black/10'
                    }`}
                    data-testid={`contagem-${a.id}`}
                  >
                    {qtd}
                  </span>
                </button>
              );
            })}
          </div>

          <section role="tabpanel" aria-label={ABAS.find((a) => a.id === aba)?.titulo}>
            {daAba.length === 0 ? (
              <EmptyState title="Nenhum pedido aqui" description="Os pedidos aparecem sozinhos quando chegam." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{daAba.map(card)}</div>
            )}
          </section>

          {/* O que precisa de ação fora da fila normal */}
          {tardios.length > 0 && (
            <section id="pix-vencido" aria-label="Pix vencido — ainda dá pra confirmar" className="scroll-mt-20 space-y-3">
              <h2 className="text-lg font-bold text-amber-800">
                Pix vencido — ainda dá pra confirmar ({tardios.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tardios.map(card)}</div>
            </section>
          )}

          {devolver.length > 0 && (
            <section id="devolver" aria-label="Devolver ao cliente" className="scroll-mt-20 space-y-3">
              <h2 className="text-lg font-bold text-amber-800">Devolver ao cliente ({devolver.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{devolver.map(card)}</div>
            </section>
          )}
        </>
      )}

      <Comanda pedido={imprimindo} nomeLoja={loja?.nome} />
    </div>
  );
}
