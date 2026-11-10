import { useEffect, useState } from 'react';
import { Check, Copy, Timer } from 'lucide-react';
import type { PixPedido } from '@/types';
import { useToast } from '@/context/ToastContext';
import { MSG_PIX_EXPIRADO } from '@/lib/statusPedido';
import { formatBRL } from '@/lib/format';
import { QrCodePix } from './QrCodePix';

const restante = (expiraEm: string) => Math.max(0, Date.parse(expiraEm) - Date.now());

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Copia para a área de transferência. Sem contexto seguro (http na rede local) o
// navigator.clipboard não existe: cai no execCommand com um textarea temporário.
async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* tenta o caminho antigo */
  }
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  return ok;
}

// Bloco do Pix pendente: QR Code, copia e cola e contagem regressiva dos 15 minutos.
// `onExpirou` pede ao pai para buscar o pedido na hora (a API cancela o pedido vencido).
export function PixPagamento({ pix, onExpirou }: { pix: PixPedido; onExpirou: () => void }) {
  const toast = useToast();
  const [ms, setMs] = useState(() => restante(pix.expiraEm));
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const r = restante(pix.expiraEm);
      setMs(r);
      if (r === 0) {
        clearInterval(timer);
        onExpirou();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [pix.expiraEm, onExpirou]);

  const aoCopiar = async () => {
    if (await copiar(pix.copiaECola)) {
      setCopiado(true);
      toast.success('Código Pix copiado. Cole no app do seu banco.');
      setTimeout(() => setCopiado(false), 3000);
    } else {
      toast.error('Não foi possível copiar. Selecione o código abaixo e copie.');
    }
  };

  if (ms === 0) {
    return (
      <p role="status" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        {MSG_PIX_EXPIRADO}
      </p>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div>
        <p className="text-sm text-slate-500">Pague com Pix</p>
        <p className="text-2xl font-bold text-slate-800">{formatBRL(pix.valor)}</p>
      </div>
      <p
        className="inline-flex items-center gap-2 rounded-full bg-strawberry-100 px-3 py-1 text-sm font-bold text-strawberry-700"
        aria-live="off"
      >
        <Timer className="h-4 w-4" /> Pague em <span data-testid="contagem-pix">{mmss(ms)}</span>
      </p>
      <QrCodePix codigo={pix.copiaECola} />
      <button type="button" className="btn-primary w-full" onClick={aoCopiar}>
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copiado ? 'Código copiado' : 'Copiar código Pix'}
      </button>
      <textarea
        readOnly
        aria-label="Código Pix copia e cola"
        className="input h-20 resize-none break-all font-mono text-[11px] text-slate-500"
        value={pix.copiaECola}
        onFocus={(e) => e.currentTarget.select()}
      />
      <p className="rounded-xl bg-blueberry-50 px-4 py-3 text-sm font-semibold text-blueberry-700">
        A loja confirma o pagamento antes de começar o preparo.
      </p>
    </div>
  );
}
