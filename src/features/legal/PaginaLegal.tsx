import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { VERSAO_TERMOS } from '@/config/termos';

// Moldura das páginas públicas de texto (privacidade e regras dos pontos). Os textos são
// RASCUNHOS: o aviso no topo só sai quando a loja revisar e preencher os [CAMPOS].
export function PaginaLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl space-y-6 pb-10">
      <p
        role="note"
        className="flex items-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900"
      >
        <AlertTriangle className="h-5 w-5 shrink-0" />
        [REVISAR ANTES DE PUBLICAR] Rascunho: os trechos entre colchetes precisam ser preenchidos pela
        loja.
      </p>
      <header>
        <h1 className="text-2xl font-bold text-slate-800">{titulo}</h1>
        <p className="mt-1 text-xs text-slate-400">Versão {VERSAO_TERMOS}</p>
      </header>
      <div className="space-y-6 text-sm leading-relaxed text-slate-600 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-800 [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
      <nav className="flex flex-wrap gap-4 border-t border-cream-200 pt-4 text-sm font-semibold">
        <Link to="/privacidade" className="text-blueberry-600 hover:underline">
          Política de privacidade
        </Link>
        <Link to="/regras-pontos" className="text-blueberry-600 hover:underline">
          Regras dos pontos
        </Link>
        <Link to="/catalogo" className="text-blueberry-600 hover:underline">
          Voltar ao cardápio
        </Link>
      </nav>
    </article>
  );
}
