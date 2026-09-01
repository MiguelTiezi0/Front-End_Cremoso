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
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notificacoes: Notificacao[];
  naoLidas: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markLida: (id: number) => Promise<void>;
  markTodasLidas: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Intervalo de polling. Preparado para troca futura por WebSocket:
// basta substituir este setInterval por uma assinatura de socket que chame refresh().
const POLL_MS = 30_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      setNotificacoes(await notificacaoService.list());
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotificacoes([]);
      return;
    }
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, refresh]);

  const markLida = useCallback(async (id: number) => {
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    await notificacaoService.markLida(id);
  }, []);

  const markTodasLidas = useCallback(async () => {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    await notificacaoService.markTodasLidas();
  }, []);

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
