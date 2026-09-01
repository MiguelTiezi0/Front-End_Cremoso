import type { ReactNode } from 'react';
import { IceCream, Sparkles, Star } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

// Layout de duas colunas para telas de login/cadastro (mobile-first: empilha no celular).
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel decorativo */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-blueberry-600 p-10 text-white lg:flex">
        <Logo inverted />
        <div className="relative z-10">
          <h1 className="text-4xl font-bold leading-tight">
            Sorvete gelado,
            <br />
            entrega quentinha.
          </h1>
          <p className="mt-4 max-w-sm text-blueberry-100">
            Peça seus sabores favoritos, acumule pontos e acompanhe a entrega em tempo real com o
            Cremoso.
          </p>
          <div className="mt-8 flex gap-6 text-sm font-semibold text-blueberry-50">
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4" /> Fidelidade
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Promoções
            </span>
            <span className="flex items-center gap-2">
              <IceCream className="h-4 w-4" /> +30 sabores
            </span>
          </div>
        </div>
        <IceCream className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 text-white/5" />
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-cream-50 p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
