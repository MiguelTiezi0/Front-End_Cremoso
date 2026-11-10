import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ClipboardList,
  Gift,
  IceCreamCone,
  LayoutDashboard,
  Menu,
  LogIn,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Tags,
  X,
} from 'lucide-react';
import { DISPONIVEL } from '@/config/mock';
import { useAuth } from '@/context/AuthContext';
import { useCarrinho } from '@/context/CarrinhoContext';
import { AvisoLojaSemPix } from './AvisoLojaSemPix';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  clienteOnly?: boolean;
  publico?: boolean; // aparece também para quem não fez login
  disponivel?: boolean; // false = módulo sem backend (src/config/mock.ts): fica fora do menu
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/catalogo', label: 'Catálogo', icon: IceCreamCone, clienteOnly: true, publico: true },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag, clienteOnly: true, disponivel: DISPONIVEL.pedidos },
  { to: '/pontos', label: 'Pontos', icon: Gift, clienteOnly: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList, adminOnly: true },
  { to: '/admin/produtos', label: 'Produtos', icon: Package, adminOnly: true },
  { to: '/admin/categorias', label: 'Categorias', icon: Tags, adminOnly: true },
  { to: '/admin/loja', label: 'Loja', icon: Settings, adminOnly: true },
];

export function AppLayout() {
  const { user, isAdmin } = useAuth();
  const { quantidadeTotal } = useCarrinho();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV.filter(
    (i) =>
      i.disponivel !== false &&
      (user || i.publico) &&
      (!i.adminOnly || isAdmin) &&
      (!i.clienteOnly || !isAdmin),
  );

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="sticky top-0 z-30 border-b border-cream-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <button
            className="rounded-full p-2 text-slate-500 hover:bg-cream-100 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <NavLink to={user ? '/dashboard' : '/catalogo'}>
            <Logo />
          </NavLink>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {items.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {/* Mesma condição do polling no NotificationProvider. */}
            {user?.role === 'CLIENTE' && DISPONIVEL.notificacoes && <NotificationBell />}
            {!isAdmin && (
              <Link
                to="/carrinho"
                className="relative rounded-full p-2 text-slate-500 hover:bg-cream-100"
                aria-label={`Carrinho (${quantidadeTotal} ${quantidadeTotal === 1 ? 'item' : 'itens'})`}
              >
                <ShoppingCart className="h-5 w-5" />
                {quantidadeTotal > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-strawberry-500 px-1 text-[10px] font-bold text-white">
                    {quantidadeTotal > 99 ? '99+' : quantidadeTotal}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <UserMenu />
            ) : (
              <Link to="/login" className="btn-primary px-3 py-2">
                <LogIn className="h-4 w-4" /> Entrar
              </Link>
            )}
          </div>
        </div>

        {/* Menu mobile */}
        {mobileOpen && (
          <nav className="flex flex-col gap-1 border-t border-cream-200 px-4 py-3 lg:hidden">
            {items.map((item) => (
              <NavItemLink key={item.to} item={item} onClick={() => setMobileOpen(false)} />
            ))}
          </nav>
        )}
      </header>

      {isAdmin && <AvisoLojaSemPix />}

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavItemLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          isActive
            ? 'bg-blueberry-50 text-blueberry-700'
            : 'text-slate-500 hover:bg-cream-100 hover:text-slate-700'
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}
