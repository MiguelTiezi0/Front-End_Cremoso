import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Gift,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingBag,
  Tags,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  clienteOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag, clienteOnly: true },
  { to: '/pontos', label: 'Pontos', icon: Gift, clienteOnly: true },
  { to: '/admin/produtos', label: 'Produtos', icon: Package, adminOnly: true },
  { to: '/admin/categorias', label: 'Categorias', icon: Tags, adminOnly: true },
];

export function AppLayout() {
  const { isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV.filter((i) => (!i.adminOnly || isAdmin) && (!i.clienteOnly || !isAdmin));

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="sticky top-0 z-30 border-b border-cream-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <button
            className="rounded-full p-2 text-slate-500 hover:bg-cream-100 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <NavLink to="/dashboard">
            <Logo />
          </NavLink>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {!isAdmin && <NotificationBell />}
            <UserMenu />
          </div>
        </div>

        {/* Menu mobile */}
        {mobileOpen && (
          <nav className="flex flex-col gap-1 border-t border-cream-200 px-4 py-3 md:hidden">
            {items.map((item) => (
              <NavItemLink key={item.to} item={item} onClick={() => setMobileOpen(false)} />
            ))}
          </nav>
        )}
      </header>

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
