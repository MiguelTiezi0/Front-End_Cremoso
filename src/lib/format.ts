// Helpers de formatação (pt-BR).

// Texto exibido no lugar de valores opcionais ausentes (ex.: pontos nulos).
export const SEM_VALOR = '—';

export const formatBRL = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatData = (iso: string): string =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));

export const formatDataHora = (iso: string): string =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );

// Saldo zero: em vez de "0 pts", explica como ganhar.
export const SEM_PONTOS = 'Você ganha pontos a cada pedido concluído';

// null (pontos opcionais no contrato) vira "—".
export const formatPontos = (n: number | null): string =>
  n === null ? SEM_VALOR : `${new Intl.NumberFormat('pt-BR').format(n)} pts`;

// Extrai uma mensagem amigável de um erro de API (Axios ou mock).
export function extractErrorMessage(err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    if (anyErr.response?.data?.message) return anyErr.response.data.message;
    if (anyErr.message) return anyErr.message;
  }
  return fallback;
}

// Status HTTP de um erro de API (Axios ou mock), se houver.
export function statusHttp(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  return (err as { response?: { status?: number } }).response?.status;
}

// Máscara simples de CEP (00000-000).
export const maskCep = (v: string): string =>
  v
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');

// Máscara simples de telefone (00) 00000-0000.
export const maskTelefone = (v: string): string =>
  v
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
