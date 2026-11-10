import { useCallback, useEffect, useRef, useState } from 'react';

export type EstadoTela = 'pedindo' | 'acesa' | 'recusada' | 'sem-suporte';

// Mantém a tela do aparelho acesa enquanto o painel está aberto (Screen Wake Lock API).
// O navegador pode recusar (sem https, bateria fraca, navegador antigo): o painel continua
// funcionando e só mostra o aviso. O bloqueio cai quando a aba sai da tela; ao voltar,
// pede de novo.
export function useWakeLock() {
  const [estado, setEstado] = useState<EstadoTela>(() =>
    'wakeLock' in navigator ? 'pedindo' : 'sem-suporte',
  );
  const sentinela = useRef<WakeLockSentinel | null>(null);
  const montado = useRef(true);

  const pedir = useCallback(async () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    if (sentinela.current && !sentinela.current.released) return;
    try {
      const s = await navigator.wakeLock.request('screen');
      sentinela.current = s;
      if (montado.current) setEstado('acesa');
      s.addEventListener('release', () => montado.current && setEstado('pedindo'));
    } catch {
      if (montado.current) setEstado('recusada');
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    // Fora do corpo do effect: o estado só muda quando o navegador responde.
    const inicio = setTimeout(() => void pedir(), 0);
    const aoVoltar = () => void pedir();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearTimeout(inicio);
      montado.current = false;
      document.removeEventListener('visibilitychange', aoVoltar);
      void sentinela.current?.release().catch(() => undefined);
      sentinela.current = null;
    };
  }, [pedir]);

  // Alguns navegadores só liberam depois de um toque: o botão "Ativar som" pede de novo.
  return { estado, pedir };
}
