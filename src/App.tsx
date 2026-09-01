import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute';
import { FullScreenLoader } from './components/ui/Loaders';

// Code-splitting por página.
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const CadastroPage = lazy(() => import('./features/auth/CadastroPage'));
const PerfilPage = lazy(() => import('./features/auth/PerfilPage'));
const EnderecosPage = lazy(() => import('./features/auth/EnderecosPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const PontosPage = lazy(() => import('./features/pontos/PontosPage'));
const PedidosPage = lazy(() => import('./features/pedidos/PedidosPage'));
const PedidoDetalhePage = lazy(() => import('./features/pedidos/PedidoDetalhePage'));
const NotificacoesPage = lazy(() => import('./features/notificacoes/NotificacoesPage'));
const ProdutosPage = lazy(() => import('./features/admin/ProdutosPage'));
const CategoriasPage = lazy(() => import('./features/admin/CategoriasPage'));
const NotFoundPage = lazy(() => import('./features/NotFoundPage'));

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        {/* Rotas públicas (redirecionam se já logado) */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
        </Route>

        {/* Rotas protegidas (exigem login) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
          </Route>
        </Route>

        {/* Rotas protegidas exclusivas de cliente (sem sentido para o painel de funcionário) */}
        <Route element={<ProtectedRoute clienteOnly />}>
          <Route element={<AppLayout />}>
            <Route path="/enderecos" element={<EnderecosPage />} />
            <Route path="/pontos" element={<PontosPage />} />
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/pedidos/:id" element={<PedidoDetalhePage />} />
            <Route path="/notificacoes" element={<NotificacoesPage />} />
          </Route>
        </Route>

        {/* Rotas protegidas de administrador */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route element={<AppLayout />}>
            <Route path="/admin/produtos" element={<ProdutosPage />} />
            <Route path="/admin/categorias" element={<CategoriasPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
