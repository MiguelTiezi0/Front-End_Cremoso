import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullScreenLoader } from '@/components/ui/Loaders';

// Auth Guard: bloqueia rotas que exigem login e (opcionalmente) papel ADMIN.
// `clienteOnly` bloqueia o inverso: telas que só fazem sentido para quem compra (cliente).
export function ProtectedRoute({
  adminOnly = false,
  clienteOnly = false,
}: {
  adminOnly?: boolean;
  clienteOnly?: boolean;
}) {
  const { isAuthenticated, isAdmin, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullScreenLoader />;

  if (!isAuthenticated) {
    // Guarda a rota pretendida para redirecionar de volta após o login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (clienteOnly && isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// Página que o login/cadastro deve abrir depois (ex.: /checkout), guardada pelo
// ProtectedRoute em location.state.from.
// eslint-disable-next-line react-refresh/only-export-components
export function destinoDepoisDoLogin(state: unknown): string {
  return (state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';
}

// Impede que usuários já autenticados vejam login/cadastro.
export function PublicOnlyRoute() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to={destinoDepoisDoLogin(location.state)} replace />;
  return <Outlet />;
}

// Rotas públicas da loja (catálogo, produto, carrinho): abertas para visitante e cliente.
// O admin não compra pelo app (a API recusa): volta para o painel.
export function LojaRoute() {
  const { isAdmin, initializing } = useAuth();
  if (initializing) return <FullScreenLoader />;
  if (isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
