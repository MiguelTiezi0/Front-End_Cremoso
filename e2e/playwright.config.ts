import { defineConfig } from '@playwright/test';

// Testes ponta a ponta do front contra a API real (VITE_USE_MOCK=false).
// Como rodar: ver e2e/README.md.
export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1, // os testes compartilham o mesmo banco
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome', // usa o Chrome instalado
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
});
