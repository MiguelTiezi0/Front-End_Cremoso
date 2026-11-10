import { useCallback, useEffect, useState } from 'react';
import type { Loja } from '@/types';
import { lojaService } from '@/api/lojaService';
import { extractErrorMessage } from '@/lib/format';

// Status da loja (GET /loja, público). Cada tela busca ao abrir: aberto/fechado muda com o
// horário e a pausa, então não vale guardar.
export function useLoja() {
  const [loja, setLoja] = useState<Loja | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(() => {
    let ativo = true;
    lojaService
      .status()
      .then((l) => {
        if (!ativo) return;
        setLoja(l);
        setErro(null);
      })
      .catch((e) => ativo && setErro(extractErrorMessage(e, 'Não foi possível ver se a loja está aberta.')))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(buscar, [buscar]);

  return { loja, erro, carregando, recarregar: buscar };
}
