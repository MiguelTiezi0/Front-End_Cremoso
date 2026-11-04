import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api';

export const CLIENTE = {
  email: process.env.E2E_CLIENTE_EMAIL ?? 'cliente@cremoso.com',
  senha: process.env.E2E_CLIENTE_SENHA ?? 'Senha@123',
};
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@cremoso.com',
  senha: process.env.E2E_ADMIN_SENHA ?? 'Admin@123',
};

// Sufixo único por execução, para não colidir com dados de rodadas anteriores.
export const RUN = Date.now().toString().slice(-6);

export interface Observacoes {
  consoleErrors: string[];
  pageErrors: string[];
  httpErrors: string[]; // respostas >= 400 da API
  requestFailed: string[]; // CORS / rede
}

const OBS_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'test-results',
  'observacoes.jsonl',
);

// Fixture `obs`: registra erros de console, exceções JS e respostas HTTP com erro em
// cada teste. Não falha o teste sozinho; o resumo vai para test-results/observacoes.jsonl.
export const test = base.extend<{ obs: Observacoes }>({
  // (o 2º parâmetro não se chama `use` para o eslint não confundir com o hook do React)
  obs: async ({ page }, usar, testInfo) => {
    const obs: Observacoes = { consoleErrors: [], pageErrors: [], httpErrors: [], requestFailed: [] };
    page.on('console', (msg) => {
      if (msg.type() === 'error') obs.consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => obs.pageErrors.push(String(err)));
    page.on('response', (res) => {
      if (res.url().startsWith(API_URL) && res.status() >= 400) {
        obs.httpErrors.push(`${res.request().method()} ${res.url().replace(API_URL, '')} -> ${res.status()}`);
      }
    });
    page.on('requestfailed', (req) =>
      obs.requestFailed.push(`${req.method()} ${req.url()} (${req.failure()?.errorText})`),
    );

    await usar(obs);

    await testInfo.attach('observacoes', {
      body: JSON.stringify(obs, null, 2),
      contentType: 'application/json',
    });
    mkdirSync(path.dirname(OBS_FILE), { recursive: true });
    appendFileSync(
      OBS_FILE,
      JSON.stringify({ teste: testInfo.titlePath.slice(1).join(' > '), status: testInfo.status, ...obs }) + '\n',
    );
  },
});

export { expect };

export async function loginUI(page: Page, email: string, senha: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

export async function apiToken(request: APIRequestContext, email: string, senha: string) {
  const res = await request.post(`${API_URL}/auth/login`, { data: { email, senha } });
  expect(res.ok(), `login via API de ${email}`).toBeTruthy();
  return (await res.json()).token as string;
}

export async function apiCriarCategoria(request: APIRequestContext, token: string, nome: string) {
  const res = await request.post(`${API_URL}/categorias`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { nome, descricao: `Descrição de ${nome}`, imagemUrl: '', ativa: true },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

export async function apiCriarProduto(
  request: APIRequestContext,
  token: string,
  categoriaId: number,
  descricao: string,
  preco = 18.9,
) {
  const res = await request.post(`${API_URL}/produtos`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      descricao,
      quantidade: 10,
      preco,
      ativo: true,
      categoriaId,
      imagemUrl: '',
      precoEmPontos: 190,
      ganhoDePontos: 19,
    },
  });
  expect(res.status()).toBe(201);
  return res.json();
}

/** Toast (role=status) com o texto informado. */
export const toast = (page: Page, texto: string | RegExp) =>
  page.getByRole('status').filter({ hasText: texto });
