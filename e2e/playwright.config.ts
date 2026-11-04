import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Testes ponta a ponta do front em dois cenários (ver e2e/README.md):
// - api-real:      VITE_USE_MOCK=false → módulos sem backend escondidos, API Python real
// - demonstracao:  VITE_USE_MOCK=true  → tudo no mock em memória, sem back-end
// O backend (porta 8080) precisa estar no ar para o cenário api-real.

const RAIZ_FRONT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_API_REAL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const BASE_DEMO = process.env.E2E_DEMO_BASE_URL ?? 'http://localhost:5174';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api';

// Sobe um Vite por cenário (ou reaproveita se já estiver rodando na porta).
const vite = (url: string, env: Record<string, string>) => ({
  command: `npx vite --port ${new URL(url).port} --strictPort --open false`,
  url,
  cwd: RAIZ_FRONT,
  reuseExistingServer: true,
  timeout: 60_000,
  env,
});

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
    channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome', // usa o Chrome instalado
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    {
      name: 'api-real',
      testIgnore: 'demonstracao.spec.ts',
      use: { baseURL: BASE_API_REAL },
    },
    {
      name: 'demonstracao',
      testMatch: 'demonstracao.spec.ts',
      use: { baseURL: BASE_DEMO },
    },
  ],
  webServer: [
    vite(BASE_API_REAL, { VITE_USE_MOCK: 'false', VITE_API_BASE_URL: API_URL }),
    vite(BASE_DEMO, { VITE_USE_MOCK: 'true' }),
  ],
});
