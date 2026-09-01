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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Reidrata a sessão a partir do storage (token + usuário) no primeiro carregamento.
  useEffect(() => {
    const token = tokenStorage.get();
    const stored = loadStoredUser();
    if (token && stored) setUser(stored);
    setInitializing(false);
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
    void authService.logout();
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
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
