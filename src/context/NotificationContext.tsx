import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Notificacao } from '@/types';
import { notificacaoService } from '@/api/notificacaoService';
import { DISPONIVEL } from '@/config/mock';
import { proximoIntervalo } from '@/lib/polling';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notificacoes: Notificacao[];
  naoLidas: number;
  loading: boolean;
  refresh: () => Promise<boolean>; // false se a busca falhou (nunca rejeita)
  markLida: (id: number) => Promise<void>;
  markTodasLidas: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Intervalo de polling. Preparado para troca futura por WebSocket:
// basta substituir o ciclo de setTimeout por uma assinatura de socket que chame refresh().
const POLL_MS = 30_000; // depois de um erro, espaça com proximoIntervalo (src/lib/polling.ts)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Notificações só existem para CLIENTE e só quando o módulo está disponível
  // (src/config/mock.ts) — a mesma condição do sino no AppLayout.
  const userId = user?.role === 'CLIENTE' && DISPONIVEL.notificacoes ? user.id : null;
  const ativo = userId !== null;
  // A lista guarda de quem é: ao trocar de usuário (ou deslogar) ela some sem precisar
  // de setState no effect.
  const [carregadas, setCarregadas] = useState<{ userId: number; lista: Notificacao[] } | null>(
    null,
  );
  const notificacoes = useMemo(
    () => (ativo && carregadas?.userId === userId ? carregadas.lista : []),
    [ativo, carregadas, userId],
  );
  const [loading, setLoading] = useState(false);

  const atualizarLista = useCallback(
    (fn: (lista: Notificacao[]) => Notificacao[]) =>
      setCarregadas((prev) => (prev ? { ...prev, lista: fn(prev.lista) } : prev)),
    [],
  );

  // Nunca rejeita: devolve false em caso de erro (a lista atual é mantida).
  const refresh = useCallback(async (): Promise<boolean> => {
    if (userId === null) return true;
    setLoading(true);
    try {
      const lista = await notificacaoService.list();
      setCarregadas({ userId, lista });
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let atraso = POLL_MS;
    const ciclo = async () => {
      const ok = await refresh();
      if (cancelado) return;
      atraso = proximoIntervalo(ok, atraso, POLL_MS);
      timer = setTimeout(() => void ciclo(), atraso);
    };
    void ciclo();
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [ativo, refresh]);

  // Atualização otimista; se o servidor falhar, recarrega a lista para desfazer.
  const markLida = useCallback(
    async (id: number) => {
      atualizarLista((lista) => lista.map((n) => (n.id === id ? { ...n, lida: true } : n)));
      try {
        await notificacaoService.markLida(id);
      } catch {
        await refresh();
      }
    },
    [atualizarLista, refresh],
  );

  const markTodasLidas = useCallback(async () => {
    atualizarLista((lista) => lista.map((n) => ({ ...n, lida: true })));
    try {
      await notificacaoService.markTodasLidas();
    } catch {
      await refresh();
    }
  }, [atualizarLista, refresh]);

  const value = useMemo<NotificationContextValue>(() => {
    const naoLidas = notificacoes.filter((n) => !n.lida).length;
    return { notificacoes, naoLidas, loading, refresh, markLida, markTodasLidas };
  }, [notificacoes, loading, refresh, markLida, markTodasLidas]);

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications deve ser usado dentro de <NotificationProvider>');
  return ctx;
}
