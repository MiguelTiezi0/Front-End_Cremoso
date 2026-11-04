import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginPayload, RegisterPayload, User } from '@/types';
import { authService } from '@/api/authService';
import { tokenStorage } from '@/api/tokenStorage';
import { statusHttp } from '@/lib/format';

const USER_KEY = 'cremoso.user';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  initializing: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// Mesmo storage escolhido no login ("manter-me conectado").
const userStore = (): Storage => (tokenStorage.isPersistent() ? localStorage : sessionStorage);

function limparSessao() {
  tokenStorage.clear();
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Sem token salvo não há o que validar: já começa pronto.
  const [initializing, setInitializing] = useState(() => tokenStorage.get() !== null);

  // Ao abrir o app com token salvo, valida a sessão em /auth/me e atualiza nome, role e
  // saldo de pontos. Enquanto isso `initializing` segura as rotas no loader, para não
  // piscar a tela errada (ex.: dashboard de admin para quem perdeu o papel).
  useEffect(() => {
    if (!tokenStorage.get()) return;
    const stored = loadStoredUser();
    let active = true;
    authService
      .me(stored?.id ?? 0)
      .then((atual) => {
        if (!active) return;
        userStore().setItem(USER_KEY, JSON.stringify(atual));
        setUser(atual);
      })
      .catch((err) => {
        if (!active) return;
        if (statusHttp(err) === 401 || !stored) {
          limparSessao(); // o ProtectedRoute leva para /login
          setUser(null);
        } else {
          // Rede/servidor fora do ar: mantém a sessão salva em vez de deslogar.
          setUser(stored);
        }
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // O interceptor do Axios dispara este evento em respostas 401 (sessão expirada).
  useEffect(() => {
    const handler = () => {
      setUser(null);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
    };
    window.addEventListener('cremoso:unauthorized', handler);
    return () => window.removeEventListener('cremoso:unauthorized', handler);
  }, []);

  const persistSession = useCallback((u: User, persist: boolean) => {
    const store = persist ? localStorage : sessionStorage;
    store.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await authService.login(payload);
      const persist = payload.lembrarMe ?? true;
      tokenStorage.set(res.token, res.refreshToken, persist);
      persistSession(res.user, persist);
      return res.user;
    },
    [persistSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await authService.register(payload);
      tokenStorage.set(res.token, res.refreshToken, true);
      persistSession(res.user, true);
      return res.user;
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    // Sessão é stateless (JWT): o POST /auth/logout é só cortesia, então uma falha
    // de rede aqui não pode impedir o logout local.
    authService.logout().catch(() => undefined);
    limparSessao();
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const store = localStorage.getItem(USER_KEY) ? localStorage : sessionStorage;
      store.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      initializing,
      login,
      register,
      logout,
      updateUser,
    }),
    [user, initializing, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
