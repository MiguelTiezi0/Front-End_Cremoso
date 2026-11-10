import { useCallback, useEffect, useRef, useState } from 'react';

type AudioContextCtor = typeof AudioContext;

const construtor = (): AudioContextCtor | undefined =>
  window.AudioContext ??
  (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;

// Som de pedido novo, gerado na hora (sem arquivo de áudio). O navegador só libera som
// depois de um toque na tela: por isso o botão "Ativar som". Se o aparelho suspender o
// áudio (tela bloqueada, aba em segundo plano), o painel volta a mostrar o aviso.
export function useSomPedidos() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [suportado] = useState(() => !!construtor());

  const tocar = useCallback((): boolean => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return false;
    const t0 = ctx.currentTime;
    // Três notas curtas, alto o bastante para um balcão movimentado.
    [880, 1175, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      const inicio = t0 + i * 0.22;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      vol.gain.setValueAtTime(0.0001, inicio);
      vol.gain.exponentialRampToValueAtTime(0.8, inicio + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.2);
      osc.connect(vol).connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.22);
    });
    return true;
  }, []);

  // Chamado no toque do botão (gesto do usuário).
  const ativar = useCallback(async () => {
    const Ctor = construtor();
    if (!Ctor) return false;
    const ctx = (ctxRef.current ??= new Ctor());
    ctx.onstatechange = () => setAtivo(ctx.state === 'running');
    try {
      await ctx.resume();
    } catch {
      /* continua suspenso: o aviso segue na tela */
    }
    const ok = ctx.state === 'running';
    setAtivo(ok);
    if (ok) tocar(); // confirma para quem tocou que o som funciona
    return ok;
  }, [tocar]);

  const desativar = useCallback(() => {
    void ctxRef.current?.suspend();
    setAtivo(false);
  }, []);

  useEffect(
    () => () => {
      void ctxRef.current?.close();
    },
    [],
  );

  return { ativo, suportado, ativar, desativar, tocar };
}
