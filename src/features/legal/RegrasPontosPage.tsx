import { PaginaLegal } from './PaginaLegal';

// RASCUNHO das regras dos pontos. Segue o que a API faz (Back-end/app/services/pontos_service.py):
// pontos por produto, creditados ao concluir, estornados se o pedido concluído for cancelado.
export default function RegrasPontosPage() {
  return (
    <PaginaLegal titulo="Regras dos pontos">
      <section>
        <h2>Como você ganha pontos</h2>
        <ul>
          <li>Cada produto do cardápio vale uma quantidade de pontos, mostrada no produto.</li>
          <li>
            Os pontos de um pedido são a soma dos pontos de cada produto vezes a quantidade. O app mostra
            quanto o pedido rende antes de você finalizar.
          </li>
          <li>
            Os pontos entram no seu saldo quando a loja marca o pedido como <strong>concluído</strong> (depois
            da retirada ou da entrega), uma vez só por pedido.
          </li>
          <li>Pedido cancelado antes de ser concluído não rende pontos.</li>
        </ul>
      </section>

      <section>
        <h2>Estorno</h2>
        <p>
          Se um pedido já concluído for cancelado depois (por exemplo, por problema no pagamento), os pontos
          dele são retirados do seu saldo. Você vê o estorno no extrato de pontos.
        </p>
      </section>

      <section>
        <h2>Resgate</h2>
        <p>
          A troca de pontos por produtos <strong>ainda não está disponível</strong>. Quando estiver, as
          regras de resgate serão publicadas aqui.
        </p>
      </section>

      <section>
        <h2>Validade</h2>
        <p>
          Os pontos valem por <strong>[VALIDADE DOS PONTOS]</strong>.
        </p>
      </section>

      <section>
        <h2>Outras regras</h2>
        <p>
          [REVISAR: a loja decide se os pontos podem ser trocados por dinheiro, transferidos para outra conta
          e o que acontece se o programa acabar.]
        </p>
      </section>
    </PaginaLegal>
  );
}
