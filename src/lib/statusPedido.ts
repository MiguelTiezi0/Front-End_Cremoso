import type { StatusPedido } from '@/types';

// Rótulos dos status de pedido (fora de Misc.tsx para o fast refresh do Vite funcionar:
// arquivo de componentes só deve exportar componentes).
export const STATUS_LABEL: Record<StatusPedido, string> = {
  RECEBIDO: 'Recebido',
  EM_PREPARO: 'Em preparo',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};
