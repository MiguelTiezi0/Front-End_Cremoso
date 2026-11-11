import { PaginaLegal } from './PaginaLegal';

// RASCUNHO da política de privacidade. Descreve o que o app guarda de fato (ver os modelos
// em Back-end/app/models); os dados da loja ficam entre colchetes para a loja preencher.
export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de privacidade">
      <section>
        <h2>Quem é o responsável pelos seus dados</h2>
        <p>
          A loja <strong>[NOME DA LOJA]</strong>, CNPJ <strong>[CNPJ]</strong>, é a responsável pelos dados
          que você informa neste app. Para qualquer assunto sobre os seus dados, fale com a loja pelo e-mail{' '}
          <strong>[E-MAIL DE CONTATO]</strong>.
        </p>
      </section>

      <section>
        <h2>Quais dados o app guarda</h2>
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, e-mail, celular e senha (a senha é guardada embaralhada: nem a
            loja consegue ler).
          </li>
          <li>
            <strong>Endereço de entrega:</strong> só quando você escolhe entrega. Ele é digitado no pedido e
            fica guardado junto com aquele pedido.
          </li>
          <li>
            <strong>Histórico de pedidos:</strong> itens, observações, valores, forma de entrega e as
            mudanças de status de cada pedido.
          </li>
          <li>
            <strong>Pontos:</strong> seu saldo e o extrato (pontos ganhos e estornados).
          </li>
          <li>
            <strong>Aceite destes termos:</strong> a data em que você aceitou e a versão do texto.
          </li>
        </ul>
        <p className="mt-2">
          O pagamento é feito por Pix direto no app do seu banco: o app não recebe nem guarda dados da sua
          conta bancária ou de cartão. No seu aparelho, o navegador guarda o carrinho e a sua sessão de login.
        </p>
      </section>

      <section>
        <h2>Para que os dados são usados</h2>
        <ul>
          <li>Receber, preparar e entregar os seus pedidos.</li>
          <li>Falar com você sobre o pedido (por exemplo, pelo WhatsApp, no celular cadastrado).</li>
          <li>Calcular e mostrar os seus pontos.</li>
          <li>Cumprir obrigações legais e fiscais da loja.</li>
        </ul>
        <p className="mt-2">A loja não vende os seus dados.</p>
      </section>

      <section>
        <h2>Como pedir para ver, corrigir ou apagar seus dados</h2>
        <p>
          Nome, e-mail e celular podem ser corrigidos por você em <strong>Meu perfil</strong>. Para apagar a
          sua conta, peça à loja pelo e-mail <strong>[E-MAIL DE CONTATO]</strong>, informando o e-mail
          cadastrado. Ao apagar a conta, o saldo de pontos é perdido. Alguns registros de pedidos podem
          precisar ser mantidos pelo prazo que a lei exigir.
        </p>
      </section>
    </PaginaLegal>
  );
}
