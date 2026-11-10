import { useCallback, useEffect, useRef, useState } from 'react';
import type { PreviaPedido, PreviaPedidoInput } from '@/types';
import { pedidoService } from '@/api/pedidoService';
import { extractErrorMessage } from '@/lib/format';

interface Resultado {
  chave: string; // corpo (JSON) que gerou este resultado
  previa: PreviaPedido | null;
  erro: string | null;
}

// Prévia do checkout (POST /pedidos/previa): total, taxa, pontos, mínimo e itens recusados
// calculados pela API. Refaz quando o corpo muda (com uma pequena espera, para não chamar a
// cada tecla do CEP). Resposta atrasada de um corpo antigo é descartada.
export function usePrevia(corpo: PreviaPedidoInput | null, aoRecusar?: (p: PreviaPedido) => void) {
  const chave = corpo ? JSON.stringify(corpo) : '';
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const aoRecusarRef = useRef(aoRecusar);
  useEffect(() => {
    aoRecusarRef.current = aoRecusar;
  }, [aoRecusar]);

  useEffect(() => {
    if (!chave) return;
    let ativo = true;
    const timer = setTimeout(() => {
      pedidoService
        .previa(JSON.parse(chave) as PreviaPedidoInput)
        .then((previa) => {
          if (!ativo) return;
          setResultado({ chave, previa, erro: null });
          if (previa.recusados.length > 0) aoRecusarRef.current?.(previa);
        })
        .catch(
          (e) =>
            ativo &&
            setResultado({
              chave,
              previa: null,
              erro: extractErrorMessage(e, 'Não foi possível calcular o total.'),
            }),
        );
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [chave, tentativa]);

  const atual = resultado?.chave === chave ? resultado : null;
  const recalcular = useCallback(() => {
    setResultado(null);
    setTentativa((t) => t + 1);
  }, []);

  return {
    previa: atual?.previa ?? null,
    erro: atual?.erro ?? null,
    calculando: !!chave && !atual,
    recalcular,
  };
}
