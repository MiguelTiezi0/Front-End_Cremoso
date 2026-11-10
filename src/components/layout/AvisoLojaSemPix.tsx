import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { lojaService } from '@/api/lojaService';
import { EVENTO_LOJA_SALVA } from '@/lib/loja';

// Topo do painel (admin): enquanto a loja não tem Pix, ela não recebe pedidos. Confere ao
// trocar de tela e logo depois de salvar as configurações.
export function AvisoLojaSemPix() {
  const { pathname } = useLocation();
  const [semPix, setSemPix] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const aoSalvar = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO_LOJA_SALVA, aoSalvar);
    return () => window.removeEventListener(EVENTO_LOJA_SALVA, aoSalvar);
  }, []);

  useEffect(() => {
    let ativo = true;
    lojaService
      .status()
      .then((l) => ativo && setSemPix(l.motivoFechada === 'PAGAMENTO_NAO_CONFIGURADO'))
      .catch(() => undefined); // sem conexão: o painel já mostra o próprio aviso
    return () => {
      ativo = false;
    };
  }, [pathname, versao]);

  if (!semPix) return null;
  return (
    <div role="alert" className="border-b border-amber-300 bg-amber-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 text-sm font-bold text-amber-900">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        A loja ainda não recebe pedidos: configure o Pix.
        {pathname !== '/admin/loja' && (
          <Link to="/admin/loja" className="underline">
            Configurar agora
          </Link>
        )}
      </div>
    </div>
  );
}
