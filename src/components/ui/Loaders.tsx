import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />;
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50">
      <div className="flex flex-col items-center gap-3 text-blueberry-600">
        <Spinner className="h-8 w-8" />
        <span className="text-sm font-semibold text-slate-500">Carregando…</span>
      </div>
    </div>
  );
}

// Skeleton genérico (bloco pulsante).
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-cream-200/70 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function RowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex gap-4 p-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}
