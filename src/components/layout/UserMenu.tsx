import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, MapPin, ShoppingBag, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function UserMenu() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  const iniciais = user.nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-cream-100"
        aria-label="Menu do usuário"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blueberry-500 text-xs font-bold text-white">
          {iniciais}
        </span>
        <span className="hidden text-sm font-bold text-slate-700 sm:block">
          {user.nome.split(' ')[0]}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-soft">
          <div className="border-b border-cream-200 px-4 py-3">
            <p className="text-sm font-bold text-slate-800">{user.nome}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <nav className="py-1">
            <MenuLink to="/perfil" icon={<UserIcon className="h-4 w-4" />} onClick={() => setOpen(false)}>
              Meu perfil
            </MenuLink>
            {!isAdmin && (
              <>
                <MenuLink
                  to="/enderecos"
                  icon={<MapPin className="h-4 w-4" />}
                  onClick={() => setOpen(false)}
                >
                  Endereços
                </MenuLink>
                <MenuLink
                  to="/pedidos"
                  icon={<ShoppingBag className="h-4 w-4" />}
                  onClick={() => setOpen(false)}
                >
                  Meus pedidos
                </MenuLink>
              </>
            )}
          </nav>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 border-t border-cream-200 px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-cream-100"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  icon,
  children,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-cream-50"
    >
      {icon}
      {children}
    </Link>
  );
}
