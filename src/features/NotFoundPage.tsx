import { Link } from 'react-router-dom';
import { IceCream } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 p-6 text-center">
      <IceCream className="h-16 w-16 text-blueberry-300" />
      <h1 className="text-5xl font-bold text-slate-800">404</h1>
      <p className="text-slate-500">Ops! Essa página derreteu.</p>
      <Link to="/dashboard" className="btn-primary mt-2">
        Voltar ao início
      </Link>
    </div>
  );
}
