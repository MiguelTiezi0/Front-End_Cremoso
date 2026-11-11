import type {
  LojaConfig,
  LojaConfigInput,
  PedidoAdmin,
  ResumoDia,
  StatusPagamento,
  StatusPedido,
} from '@/types';
import { MOCK } from '@/config/mock';
import { api } from './client';
import { mock } from './mock/carregar';

// Painel da loja (ADMIN): fila de pedidos, mudanças de status e pagamento, resumo do dia e
// configurações. As regras ficam todas na API; a tela só mostra o que ela permite.

// Fila do painel: com todos os status e sem data, a API devolve os ativos de qualquer dia e
// os concluídos e cancelados de hoje. (Sem status, ela devolve só os ativos.)
export const FILA_DO_PAINEL: StatusPedido[] = [
  'RECEBIDO',
  'ACEITO',
  'EM_PREPARO',
  'PRONTO',
  'SAIU_PARA_ENTREGA',
  'CONCLUIDO',
  'CANCELADO',
];

export const adminPedidoService = {
  async list(filtro: { status?: StatusPedido[]; data?: string } = {}): Promise<PedidoAdmin[]> {
    if (MOCK.pedidos) return (await mock()).adminListPedidos(filtro);
    const params: Record<string, string> = {};
    if (filtro.status?.length) params.status = filtro.status.join(',');
    if (filtro.data) params.data = filtro.data;
    const { data } = await api.get<PedidoAdmin[]>('/admin/pedidos', { params });
    return data;
  },
  async get(id: number): Promise<PedidoAdmin> {
    if (MOCK.pedidos) return (await mock()).adminGetPedido(id);
    const { data } = await api.get<PedidoAdmin>(`/admin/pedidos/${id}`);
    return data;
  },
  // statusAtual é o que a tela mostrava: se outro aparelho mudou antes, a API responde 409
  // STATUS_DESATUALIZADO em vez de pular etapas.
  async mudarStatus(
    id: number,
    statusAtual: StatusPedido,
    para: StatusPedido,
    motivo?: string,
  ): Promise<PedidoAdmin> {
    if (MOCK.pedidos) return (await mock()).adminMudarStatus(id, statusAtual, para, motivo);
    const { data } = await api.post<PedidoAdmin>(`/admin/pedidos/${id}/status`, {
      para,
      statusAtual,
      motivo,
    });
    return data;
  },
  async pagamento(id: number, status: StatusPagamento): Promise<PedidoAdmin> {
    if (MOCK.pedidos) return (await mock()).adminPagamento(id, status);
    const { data } = await api.post<PedidoAdmin>(`/admin/pedidos/${id}/pagamento`, { status });
    return data;
  },
  async resumo(dataDia?: string): Promise<ResumoDia> {
    if (MOCK.pedidos) return (await mock()).adminResumo();
    const { data } = await api.get<ResumoDia>('/admin/pedidos/resumo', {
      params: dataDia ? { data: dataDia } : {},
    });
    return data;
  },
};

export const adminLojaService = {
  async config(): Promise<LojaConfig> {
    if (MOCK.loja) return (await mock()).adminGetLoja();
    const { data } = await api.get<LojaConfig>('/admin/loja');
    return data;
  },
  // "Pausar pedidos": minutos = pausa por tempo (a loja volta sozinha); sem minutos, até
  // reabrir. pausada=false reabre na hora.
  async pausar(pausada: boolean, minutos?: number): Promise<LojaConfig> {
    if (MOCK.loja) return (await mock()).adminPausarLoja(pausada, minutos);
    const { data } = await api.patch<LojaConfig>('/admin/loja/pausa', { pausada, minutos });
    return data;
  },
  async salvar(input: LojaConfigInput): Promise<LojaConfig> {
    if (MOCK.loja) return (await mock()).adminSalvarLoja(input);
    const { data } = await api.put<LojaConfig>('/admin/loja', input);
    return data;
  },
};
