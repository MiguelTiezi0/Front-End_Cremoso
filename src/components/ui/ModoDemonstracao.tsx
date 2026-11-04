import { FlaskConical } from 'lucide-react';

// Aviso discreto de que auth/catálogo estão usando o mock em memória (VITE_USE_MOCK=true).
// Só aparece em dev: em produção o mock nunca liga (src/config/mockFlag.ts).
export function ModoDemonstracao() {
  return (
    <div
      role="note"
      title="VITE_USE_MOCK=true: dados do mock em memória, sem back-end"
      className="pointer-events-none fixed bottom-3 left-3 z-40 flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm"
    >
      <FlaskConical className="h-3.5 w-3.5" />
      Modo demonstração
    </div>
  );
}
