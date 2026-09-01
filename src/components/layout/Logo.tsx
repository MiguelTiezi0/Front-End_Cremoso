import { IceCream2 } from 'lucide-react';

export function Logo({ compact = false, inverted = false }: { compact?: boolean; inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${
          inverted ? 'bg-white/15' : 'bg-blueberry-500'
        }`}
      >
        <IceCream2 className="h-5 w-5" />
      </span>
      {!compact && (
        <span
          className={`text-xl font-bold tracking-tight ${inverted ? 'text-white' : 'text-slate-800'}`}
        >
          Crem<span className={inverted ? 'text-blueberry-200' : 'text-blueberry-600'}>oso</span>
        </span>
      )}
    </span>
  );
}
