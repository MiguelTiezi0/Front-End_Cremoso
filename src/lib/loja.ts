import type { Loja } from '@/types';

// Disparado pelo painel depois de salvar as configurações (o aviso de "sem Pix" confere de novo).
export const EVENTO_LOJA_SALVA = 'cremoso:loja-salva';

// Horários da loja são do fuso dela, não do aparelho do cliente.
const FUSO_LOJA = 'America/Sao_Paulo';

export const dataNoFuso = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_LOJA }).format(d); // AAAA-MM-DD

export const horaNoFuso = (d: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_LOJA,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);

const diaDaSemana = (d: Date) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO_LOJA, weekday: 'long' }).format(d);

// "abre às 13:00" (hoje), "abre amanhã às 13:00" ou "abre sábado às 13:00".
export function textoProximaAbertura(iso: string, agora = new Date()): string {
  const abre = new Date(iso);
  const hora = horaNoFuso(abre);
  if (dataNoFuso(abre) === dataNoFuso(agora)) return `abre às ${hora}`;
  const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
  if (dataNoFuso(abre) === dataNoFuso(amanha)) return `abre amanhã às ${hora}`;
  return `abre ${diaDaSemana(abre).replace('-feira', '')} às ${hora}`;
}

export interface StatusLojaTexto {
  aberta: boolean;
  titulo: string; // "Aberto agora" | "Fechado, abre às 13:00"
  detalhe?: string;
}

export function statusLojaTexto(loja: Loja, agora = new Date()): StatusLojaTexto {
  if (loja.aberta) return { aberta: true, titulo: 'Aberto agora' };
  switch (loja.motivoFechada) {
    case 'PAUSADA':
      return {
        aberta: false,
        titulo: 'Fechado no momento',
        detalhe: 'A loja pausou os pedidos por alguns instantes. Tente de novo em breve.',
      };
    case 'PAGAMENTO_NAO_CONFIGURADO':
      // A API só abre a loja com o Pix configurado (sem Pix não há como pagar).
      return {
        aberta: false,
        titulo: 'Fechado',
        detalhe: 'A loja ainda não está recebendo pedidos pelo app.',
      };
    default:
      return {
        aberta: false,
        titulo: loja.proximaAbertura
          ? `Fechado, ${textoProximaAbertura(loja.proximaAbertura, agora)}`
          : 'Fechado',
        detalhe: 'Você pode montar o carrinho agora e finalizar quando a loja abrir.',
      };
  }
}

// Link do WhatsApp com mensagem pronta. A loja guarda o número como "(16) 99999-0000".
export function linkWhatsApp(numero: string, mensagem: string): string | null {
  let digitos = numero.replace(/\D/g, '');
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (digitos.length < 12) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}
