import { Link } from 'react-router-dom';

// Rodapé com os textos públicos (em todas as telas com layout e no login/cadastro).
export function RodapeLegal() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-6 text-xs text-slate-400">
      <Link to="/privacidade" className="hover:text-slate-600 hover:underline">
        Política de privacidade
      </Link>
      <Link to="/regras-pontos" className="hover:text-slate-600 hover:underline">
        Regras dos pontos
      </Link>
    </footer>
  );
}
