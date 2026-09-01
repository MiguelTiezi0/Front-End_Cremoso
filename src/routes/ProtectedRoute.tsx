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

// Impede que usuários já autenticados vejam login/cadastro.
export function PublicOnlyRoute() {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
