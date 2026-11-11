import { useCallback, useEffect, useState } from 'react';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { adminLojaService } from '@/api/adminService';
import { Spinner } from '@/components/ui/Loaders';
import { useToast } from '@/context/ToastContext';
import { extractErrorMessage } from '@/lib/format';
import { horaNoFuso } from '@/lib/loja';

interface Estado {
  pausada: boolean;
  pausadaAte: string | null;
}

// "Pausar pedidos": um toque fecha a loja na hora (a API recusa pedidos e o cardápio mostra
// "Pausado no momento"); outro toque reabre. A pausa por tempo acaba sozinha na API.
export function PausaPedidos({ agora }: { agora: number }) {
  const toast = useToast();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Confere ao abrir e a cada 30 s (outro aparelho pode ter pausado ou reaberto).
  const buscar = useCallback(() => {
    adminLojaService
      .config()
      .then((c) => setEstado({ pausada: c.pausada, pausadaAte: c.pausadaAte }))
      .catch(() => undefined); // sem conexão: o painel já mostra o aviso
  }, []);
  useEffect(() => {
    const inicio = setTimeout(buscar, 0);
    const t = setInterval(buscar, 30_000);
    return () => {
      clearTimeout(inicio);
      clearInterval(t);
    };
  }, [buscar]);

  const mudar = async (pausada: boolean, minutos?: number) => {
    setEnviando(true);
    try {
      const c = await adminLojaService.pausar(pausada, minutos);
      setEstado({ pausada: c.pausada, pausadaAte: c.pausadaAte });
      toast.success(pausada ? 'Pedidos pausados.' : 'Pedidos reabertos.');
    } catch (e) {
      toast.error(extractErrorMessage(e, 'Não foi possível mudar a pausa.'));
    } finally {
      setEnviando(false);
    }
  };

  if (!estado) return null;
  // Pausa por tempo que já acabou: mostra aberta sem esperar a próxima consulta.
  const pausada = estado.pausada && (!estado.pausadaAte || Date.parse(estado.pausadaAte) > agora);

  if (pausada) {
    return (
      <div
        role="status"
        aria-label="Pedidos pausados"
        className="flex flex-col gap-3 rounded-2xl border-2 border-strawberry-300 bg-strawberry-100/60 p-4 sm:flex-row sm:items-center"
      >
        <p className="flex flex-1 items-center gap-2 font-bold text-strawberry-700">
          <PauseCircle className="h-6 w-6 shrink-0" />
          <span>
            Pedidos pausados{' '}
            {estado.pausadaAte ? `até as ${horaNoFuso(new Date(estado.pausadaAte))}` : 'até você reabrir'}.
            <span className="block text-sm font-semibold">
              Os clientes veem "Pausado no momento" e não conseguem pedir.
            </span>
          </span>
        </p>
        <button
          type="button"
          className="btn-primary px-6 py-4 text-lg"
          disabled={enviando}
          onClick={() => void mudar(false)}
        >
          {enviando ? <Spinner className="h-5 w-5" /> : <PlayCircle className="h-6 w-6" />}
          Reabrir pedidos
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Pausar pedidos">
      <button
        type="button"
        className="btn-danger px-5 py-3 text-base"
        disabled={enviando}
        onClick={() => void mudar(true)}
      >
        {enviando ? <Spinner className="h-5 w-5" /> : <PauseCircle className="h-5 w-5" />}
        Pausar pedidos
      </button>
      <button type="button" className="btn-ghost py-3" disabled={enviando} onClick={() => void mudar(true, 30)}>
        Pausar 30 min
      </button>
      <button type="button" className="btn-ghost py-3" disabled={enviando} onClick={() => void mudar(true, 60)}>
        Pausar 1 hora
      </button>
    </div>
  );
}
