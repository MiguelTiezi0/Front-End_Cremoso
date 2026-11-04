// Backoff de polling depois de erro (notificações, detalhe do pedido): o intervalo pula
// para 2 min e dobra a cada falha seguida, até 10 min; volta ao normal no primeiro sucesso.
export const POLL_ERRO_MIN_MS = 2 * 60_000;
export const POLL_ERRO_MAX_MS = 10 * 60_000;

export function proximoIntervalo(ok: boolean, atual: number, normal: number): number {
  if (ok) return normal;
  return Math.min(Math.max(atual * 2, POLL_ERRO_MIN_MS), POLL_ERRO_MAX_MS);
}
