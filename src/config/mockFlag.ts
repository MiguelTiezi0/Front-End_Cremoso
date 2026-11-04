// Decide se o mock em memória pode ligar. Função pura (sem import.meta) para poder ser
// testada fora do Vite — ver e2e/mock-flag.spec.ts.
//
// Seguro por padrão:
// - só liga com VITE_USE_MOCK exatamente "true" (ausente, "1", "TRUE"... = desligado);
// - em build de produção nunca liga, mesmo com a variável "true".
export function mockLigado(env: { VITE_USE_MOCK?: string; PROD?: boolean }): boolean {
  if (env.PROD) return false;
  return env.VITE_USE_MOCK === 'true';
}
