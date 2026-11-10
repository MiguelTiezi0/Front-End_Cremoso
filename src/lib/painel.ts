import type { PedidoAdmin, StatusPedido } from '@/types';
import { formatBRL } from './format';
import { horaNoFuso } from './loja';
import { pixExpirado } from './statusPedido';

// Regras de tela do painel da loja (funções puras). As regras de verdade ficam na API: aqui
// só se decide o que mostrar. Mudou TRANSICOES em Back-end/app/services/pedido_service.py?
// Mude acoesDoPedido também.

export type Aba = 'NOVOS' | 'ACEITOS' | 'PREPARO' | 'PRONTOS' | 'CONCLUIDOS';

export const ABAS: { id: Aba; titulo: string; status: StatusPedido[] }[] = [
  { id: 'NOVOS', titulo: 'Novos', status: ['RECEBIDO'] },
  { id: 'ACEITOS', titulo: 'Aceitos / aguardando Pix', status: ['ACEITO'] },
  { id: 'PREPARO', titulo: 'Em preparo', status: ['EM_PREPARO'] },
  { id: 'PRONTOS', titulo: 'Prontos / saiu', status: ['PRONTO', 'SAIU_PARA_ENTREGA'] },
  { id: 'CONCLUIDOS', titulo: 'Concluídos de hoje', status: ['CONCLUIDO'] },
];

// Pago e cancelado: a loja precisa devolver o dinheiro.
export const precisaDevolver = (p: PedidoAdmin) =>
  p.status === 'CANCELADO' && p.statusPagamento === 'CONFIRMADO';

// Pix vencido que ainda dá para confirmar (a API manda o prazo; o relógio é o do aparelho).
export const pixTardioAberto = (p: PedidoAdmin, agora = Date.now()) =>
  pixExpirado(p) &&
  p.statusPagamento === 'PENDENTE' &&
  !!p.confirmarPagamentoAte &&
  Date.parse(p.confirmarPagamentoAte) > agora;

export type Acao =
  | { tipo: 'status'; para: StatusPedido; rotulo: string }
  | { tipo: 'pagamento'; rotulo: string }
  | { tipo: 'devolver' }
  | { tipo: 'cancelar'; rotulo: string };

// Botões do pedido: só as transições que a API aceita naquele status. A primeira é a
// principal (o próximo passo normal).
export function acoesDoPedido(p: PedidoAdmin, agora = Date.now()): Acao[] {
  const pendente = p.statusPagamento === 'PENDENTE';
  const cancelar: Acao = { tipo: 'cancelar', rotulo: 'Cancelar pedido' };
  switch (p.status) {
    case 'RECEBIDO':
      return [
        { tipo: 'status', para: 'ACEITO', rotulo: 'Aceitar pedido' },
        ...(pendente ? [{ tipo: 'pagamento', rotulo: 'Confirmar pagamento' } as Acao] : []),
        cancelar,
      ];
    case 'ACEITO':
      return [
        pendente
          ? { tipo: 'pagamento', rotulo: 'Confirmar pagamento' }
          : { tipo: 'status', para: 'EM_PREPARO', rotulo: 'Começar preparo' },
        cancelar,
      ];
    case 'EM_PREPARO':
      return [
        p.tipoEntrega === 'ENTREGA'
          ? { tipo: 'status', para: 'SAIU_PARA_ENTREGA', rotulo: 'Saiu para entrega' }
          : { tipo: 'status', para: 'PRONTO', rotulo: 'Pronto para retirada' },
        cancelar,
      ];
    case 'PRONTO':
    case 'SAIU_PARA_ENTREGA':
      return [{ tipo: 'status', para: 'CONCLUIDO', rotulo: 'Concluir (entregue)' }, cancelar];
    case 'CONCLUIDO':
      // A API deixa cancelar um concluído (estorna os pontos), mas não é o caminho normal.
      return [{ tipo: 'cancelar', rotulo: 'Cancelar (estorna os pontos)' }];
    case 'CANCELADO':
      if (precisaDevolver(p)) return [{ tipo: 'devolver' }];
      if (pixTardioAberto(p, agora)) return [{ tipo: 'pagamento', rotulo: 'Cliente pagou: confirmar' }];
      return [];
  }
}

// "agora", "há 4 min", "há 1 h 05 min"
export function tempoDesde(iso: string, agora = Date.now()): string {
  const min = Math.max(0, Math.floor((agora - Date.parse(iso)) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

// "faltam 1 h 20 min" / "faltam 8 min"
export function tempoAte(iso: string, agora = Date.now()): string {
  const min = Math.max(0, Math.ceil((Date.parse(iso) - agora) / 60_000));
  if (min < 60) return `faltam ${min} min`;
  return `faltam ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

export const horaDe = (iso: string) => horaNoFuso(new Date(iso));

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? '';

// Mensagem pronta para o cliente no WhatsApp, conforme o status atual.
export function mensagemParaCliente(p: PedidoAdmin, loja = 'Cremoso'): string {
  const ola = `Olá, ${primeiroNome(p.cliente.nome)}! Aqui é da ${loja}.`;
  const n = `#${p.id}`;
  let texto: string;
  switch (p.status) {
    case 'RECEBIDO':
      texto = `Recebemos seu pedido ${n}.${
        p.statusPagamento === 'PENDENTE' ? ` Assim que o Pix de ${formatBRL(p.total)} cair, confirmamos.` : ''
      }`;
      break;
    case 'ACEITO':
      texto =
        p.statusPagamento === 'PENDENTE'
          ? `Seu pedido ${n} foi aceito! Estamos aguardando o Pix de ${formatBRL(p.total)} para começar o preparo.`
          : `Pagamento do pedido ${n} confirmado! Já vamos começar o preparo.`;
      break;
    case 'EM_PREPARO':
      texto = `Seu pedido ${n} está em preparo.`;
      break;
    case 'PRONTO':
      texto = `Seu pedido ${n} está pronto para retirada.`;
      break;
    case 'SAIU_PARA_ENTREGA':
      texto = `Seu pedido ${n} saiu para entrega.`;
      break;
    case 'CONCLUIDO':
      texto = `Obrigado pelo pedido ${n}! Volte sempre.`;
      break;
    case 'CANCELADO':
      if (pixExpirado(p)) {
        texto = `O Pix do pedido ${n} venceu e o pedido foi cancelado. Se você já pagou, mande o comprovante por aqui.`;
      } else if (p.statusPagamento === 'DEVOLVIDO') {
        texto = `Seu pedido ${n} foi cancelado e devolvemos ${formatBRL(p.total)} pelo Pix.`;
      } else if (p.statusPagamento === 'CONFIRMADO') {
        texto = `Seu pedido ${n} foi cancelado${p.motivoCancelamento ? ` (${p.motivoCancelamento})` : ''}. Vamos devolver ${formatBRL(p.total)} pelo Pix.`;
      } else {
        texto = `Seu pedido ${n} foi cancelado${p.motivoCancelamento ? ` (${p.motivoCancelamento})` : ''}.`;
      }
      break;
  }
  return `${ola} ${texto}`;
}

export const ROTULO_PAGAMENTO: Record<PedidoAdmin['statusPagamento'], string> = {
  PENDENTE: 'Pix aguardando',
  CONFIRMADO: 'Pix confirmado',
  DEVOLVIDO: 'Pix devolvido',
};

// Motivos prontos para o cancelamento (um toque); "Outro" abre o campo de texto.
export const MOTIVOS_CANCELAMENTO = [
  'Produto acabou',
  'Loja vai fechar',
  'Cliente pediu para cancelar',
  'Pix não caiu',
  'Endereço fora da área',
];
