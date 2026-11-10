import { createPortal } from 'react-dom';
import type { PedidoAdmin } from '@/types';
import { formatBRL, formatDataHora } from '@/lib/format';
import { ROTULO_PAGAMENTO } from '@/lib/painel';
import { STATUS_LABEL } from '@/lib/statusPedido';

// Comanda para imprimir (impressora térmica de 58/80 mm ou A4). Fica fora do #root: na
// impressão, o CSS esconde o app e mostra só ela (ver .imprimindo em index.css).
export function Comanda({ pedido: p, nomeLoja }: { pedido: PedidoAdmin | null; nomeLoja?: string }) {
  if (!p) return null;
  return createPortal(
    <div id="area-impressao" data-testid="comanda" aria-hidden="true">
      <p className="comanda-titulo">{nomeLoja ?? 'Cremoso'}</p>
      <p className="comanda-grande">PEDIDO #{p.id}</p>
      <p>{formatDataHora(p.data)}</p>
      <p>Status: {STATUS_LABEL[p.status]}</p>
      <hr />
      <p>
        <strong>Cliente:</strong> {p.cliente.nome}
      </p>
      <p>
        <strong>Telefone:</strong> {p.cliente.telefone}
      </p>
      <hr />
      {p.itens.map((i) => (
        <div key={i.produtoId} className="comanda-item">
          <p>
            <strong>{i.quantidade}x</strong> {i.descricao} <span className="comanda-valor">{formatBRL(i.subtotal)}</span>
          </p>
          {i.observacao && <p className="comanda-obs">&gt;&gt; {i.observacao}</p>}
        </div>
      ))}
      {p.observacao && (
        <>
          <hr />
          <p className="comanda-obs">OBS: {p.observacao}</p>
        </>
      )}
      <hr />
      <p>Subtotal: {formatBRL(p.subtotal)}</p>
      {p.tipoEntrega === 'ENTREGA' && <p>Taxa de entrega: {formatBRL(p.frete)}</p>}
      <p className="comanda-grande">TOTAL: {formatBRL(p.total)}</p>
      <p>
        Pagamento: Pix · {ROTULO_PAGAMENTO[p.statusPagamento]}
      </p>
      <hr />
      {p.endereco ? (
        <>
          <p className="comanda-grande">ENTREGA</p>
          <p>
            {p.endereco.rua}, {p.endereco.numero}
            {p.endereco.complemento ? ` - ${p.endereco.complemento}` : ''}
          </p>
          <p>
            {p.endereco.bairro} · {p.endereco.cidade}
          </p>
          <p>CEP {p.endereco.cep}</p>
          {p.endereco.referencia && <p>Ref.: {p.endereco.referencia}</p>}
        </>
      ) : (
        <p className="comanda-grande">RETIRADA NO BALCÃO</p>
      )}
    </div>,
    document.body,
  );
}
