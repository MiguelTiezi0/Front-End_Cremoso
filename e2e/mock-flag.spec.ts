import { expect, test } from '@playwright/test';
import { mockLigado } from '../src/config/mockFlag';

// Teste da regra "mock seguro por padrão" (src/config/mockFlag.ts). Não abre navegador.
test.describe('USE_MOCK (mockLigado)', () => {
  test('é false quando VITE_USE_MOCK não está definida', () => {
    expect(mockLigado({})).toBe(false);
    expect(mockLigado({ VITE_USE_MOCK: undefined, PROD: false })).toBe(false);
  });

  test('só liga com o valor exatamente "true"', () => {
    expect(mockLigado({ VITE_USE_MOCK: 'true', PROD: false })).toBe(true);
    for (const valor of ['false', '', '1', 'TRUE', 'True', ' true', 'yes']) {
      expect(mockLigado({ VITE_USE_MOCK: valor, PROD: false }), `VITE_USE_MOCK=${JSON.stringify(valor)}`).toBe(
        false,
      );
    }
  });

  test('em build de produção nunca liga, mesmo com "true"', () => {
    expect(mockLigado({ VITE_USE_MOCK: 'true', PROD: true })).toBe(false);
  });
});
