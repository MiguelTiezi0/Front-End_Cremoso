import { useCallback, useEffect, useRef, useState } from 'react';
import { lojaService } from '@/api/lojaService';
import { useCarrinho } from '@/context/CarrinhoContext';
import {
  bloqueiaFinalizar,
  produtosDoCardapio,
  revalidar,
  type AvisoCarrinho,
} from '@/lib/carrinho';
import { extractErrorMessage } from '@/lib/format';

// Ao abrir o carrinho (e o checkout), confere cada item com o cardápio atual da API:
// atualiza preços e avisa o que esgotou, saiu do cardápio ou mudou de preço.
export function useRevalidarCarrinho() {
  const { itens, substituir } = useCarrinho();
  const [avisos, setAvisos] = useState<AvisoCarrinho[]>([]);
  const [conferindo, setConferindo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const itensRef = useRef(itens);
  useEffect(() => {
    itensRef.current = itens;
  }, [itens]);

  // Só faz setState depois do await, então pode rodar direto no effect.
  const buscar = useCallback(async () => {
    try {
      const { categorias } = await lojaService.cardapio();
      const resultado = revalidar(itensRef.current, produtosDoCardapio(categorias));
      substituir(resultado.itens);
      // Duas conferências ao mesmo tempo (StrictMode em dev, ou o checkout pedindo de novo):
      // a segunda já vê o preço atualizado pela primeira e não acharia mudança. O aviso de
      // preço continua enquanto o preço for o mesmo que foi avisado.
      setAvisos((anteriores) => [
        ...resultado.avisos,
        ...anteriores.filter(
          (a) =>
            a.tipo === 'PRECO' &&
            !resultado.avisos.some((n) => n.produtoId === a.produtoId) &&
            resultado.itens.some((i) => i.produtoId === a.produtoId && i.preco === a.precoAtual),
        ),
      ]);
      setErro(null);
      return resultado.avisos;
    } catch (e) {
      setErro(extractErrorMessage(e, 'Não foi possível conferir os preços do carrinho.'));
      return null;
    } finally {
      setConferindo(false);
    }
  }, [substituir]);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  const conferir = useCallback(() => {
    setConferindo(true);
    return buscar();
  }, [buscar]);

  // Removeu o item problemático: o aviso some sem precisar conferir de novo.
  const visiveis = avisos.filter((a) => itens.some((i) => i.produtoId === a.produtoId));

  return {
    avisos: visiveis,
    bloqueado: visiveis.some(bloqueiaFinalizar),
    conferindo,
    erro,
    conferir,
  };
}
