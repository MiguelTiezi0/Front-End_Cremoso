import type { Pedido, StatusPedido } from '@/types';

// Rótulos dos status de pedido (fora de Misc.tsx para o fast refresh do Vite funcionar:
// arquivo de componentes só deve exportar componentes).
export const STATUS_LABEL: Record<StatusPedido, string> = {
  RECEBIDO: 'Recebido',
  ACEITO: 'Aceito pela loja',
  EM_PREPARO: 'Em preparo',
  PRONTO: 'Pronto para retirar',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

// Frase da tela do pedido para cada status.
export const STATUS_DESCRICAO: Record<StatusPedido, string> = {
  RECEBIDO: 'A loja recebeu seu pedido e vai confirmar em instantes.',
  ACEITO: 'A loja aceitou seu pedido.',
  EM_PREPARO: 'Seu pedido está sendo preparado.',
  PRONTO: 'Seu pedido está pronto. Pode vir buscar!',
  SAIU_PARA_ENTREGA: 'Seu pedido está a caminho.',
  CONCLUIDO: 'Pedido concluído. Bom apetite!',
  CANCELADO: 'Este pedido foi cancelado.',
};

// Etapas da linha do tempo: a 4ª depende de retirada ou entrega.
export function etapasDoPedido(tipoEntrega: Pedido['tipoEntrega']): StatusPedido[] {
  return [
    'RECEBIDO',
    'ACEITO',
    'EM_PREPARO',
    tipoEntrega === 'ENTREGA' ? 'SAIU_PARA_ENTREGA' : 'PRONTO',
    'CONCLUIDO',
  ];
}

// Pix não confirmado em 15 min: a API cancela com este motivo. Até 2 h depois a loja ainda
// pode confirmar o pagamento e o pedido volta para o fluxo (o polling mostra a mudança).
export const pixExpirado = (p: Pick<Pedido, 'status' | 'motivoCancelamento' | 'canceladoPor'>) =>
  p.status === 'CANCELADO' && p.motivoCancelamento === 'PIX_EXPIRADO' && p.canceladoPor === 'SISTEMA';

export const MSG_PIX_EXPIRADO = 'Pix expirado. Se você já pagou, a loja vai confirmar em breve.';
