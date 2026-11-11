import {
  test as base,
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSAO_TERMOS } from '../src/config/termos';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080/api';

// Aceite da política de privacidade e das regras dos pontos (obrigatório no cadastro).
export const ACEITE = { aceiteTermos: true, versaoTermos: VERSAO_TERMOS };

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
// Sessões do painel abertas por abrirPainel: fechadas ao fim de cada teste, senão continuam
// atualizando a fila a cada 10 s e deixam os testes seguintes lentos.
const paineisAbertos: BrowserContext[] = [];

export const test = base.extend<{ obs: Observacoes; fecharPaineis: void }>({
  fecharPaineis: [
    async ({ browser }, usar) => {
      void browser;
      await usar();
      await Promise.all(paineisAbertos.splice(0).map((c) => c.close()));
    },
    { auto: true },
  ],
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

// --- Entrega 2: pedidos ----------------------------------------------------------------

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Conta nova de cliente (pedidos e pontos sem interferir nas contas do seed). */
export async function apiNovoCliente(request: APIRequestContext, prefixo: string) {
  const email = `${prefixo}${RUN}${Math.floor(Math.random() * 1e4)}@teste.com`;
  const senha = 'Senha123';
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { nome: `Cliente ${prefixo}`, email, telefone: '11987654321', senha, ...ACEITE },
  });
  expect(res.ok(), `cadastro de ${email}`).toBeTruthy();
  return { email, senha };
}

export async function apiEsgotado(request: APIRequestContext, token: string, id: number, esgotado: boolean) {
  const res = await request.patch(`${API_URL}/produtos/${id}/esgotado`, {
    headers: auth(token),
    data: { esgotado },
  });
  expect(res.status()).toBe(200);
}

/** Cliente (CLIENTE): cria um pedido de retirada pela API e devolve o JSON. */
export async function apiCriarPedido(
  request: APIRequestContext,
  token: string,
  itens: { produtoId: number; quantidade: number; observacao?: string }[],
  extra: Record<string, unknown> = {},
) {
  const res = await request.post(`${API_URL}/pedidos`, {
    headers: { ...auth(token), 'Idempotency-Key': crypto.randomUUID() },
    data: { tipoEntrega: 'RETIRADA', formaPagamento: 'PIX', itens, ...extra },
  });
  expect(res.status(), 'pedido criado').toBe(201);
  return res.json();
}

// --- Painel da loja ------------------------------------------------------------------------

/** Abre o painel (login de ADMIN) numa sessão separada da do cliente. */
export async function abrirPainel(
  browser: Browser,
  testInfo: TestInfo,
  rota = '/admin/pedidos',
  opcoes: { preparar?: (p: Page) => Promise<void>; viewport?: { width: number; height: number } } = {},
) {
  const { baseURL, locale, timezoneId, viewport } = testInfo.project.use;
  const contexto = await browser.newContext({
    baseURL,
    locale,
    timezoneId,
    viewport: opcoes.viewport ?? viewport,
    hasTouch: !!opcoes.viewport,
  });
  paineisAbertos.push(contexto);
  const painel = await contexto.newPage();
  await opcoes.preparar?.(painel);
  await loginUI(painel, ADMIN.email, ADMIN.senha);
  await expect(painel).toHaveURL(/\/dashboard$/);
  await painel.goto(rota);
  return painel;
}

/** Card do pedido no painel. */
export const cardDoPedido = (painel: Page, id: number) =>
  painel.getByRole('article', { name: `Pedido #${id}` });

/** Vai para a aba do painel ("Novos", "Aceitos", "Em preparo", "Prontos", "Concluídos"). */
export async function abaDoPainel(painel: Page, nome: string) {
  await painel.getByRole('tab', { name: new RegExp(`^${nome}`) }).click();
}

/** Painel: confirma o Pix do pedido (com a conferência do extrato). */
export async function confirmarPixNoPainel(painel: Page, id: number) {
  const card = cardDoPedido(painel, id);
  await card.getByRole('button', { name: /Confirmar pagamento|Cliente pagou: confirmar/ }).click();
  await expect(card.getByText('Confira no extrato do banco antes de confirmar.')).toBeVisible();
  await card.getByRole('button', { name: 'Sim, o Pix caiu' }).click();
  await expect(card.getByTestId('pagamento-painel')).toHaveText('Pix confirmado');
}

/** Painel: um toque no botão de mudança de status do card. */
export async function botaoNoPainel(painel: Page, id: number, nome: string) {
  const botao = cardDoPedido(painel, id).getByRole('button', { name: nome, exact: true });
  await botao.click();
  // O botão some quando a API responde (o status mudou): só então o teste segue.
  await expect(botao).toHaveCount(0);
}

/** Painel: cancela pedindo o motivo na própria tela. */
export async function cancelarNoPainel(painel: Page, id: number, motivo: string) {
  const card = cardDoPedido(painel, id);
  await card.getByRole('button', { name: /^Cancelar/ }).click();
  const grupo = card.getByRole('group', { name: 'Cancelar pedido' });
  await grupo.getByRole('button', { name: 'Outro motivo' }).click();
  await grupo.getByLabel('Motivo do cancelamento').fill(motivo);
  await grupo.getByRole('button', { name: 'Confirmar cancelamento' }).click();
  await expect(toast(painel, `Pedido #${id} cancelado.`)).toBeVisible();
}

// O Pix só vence depois de 15 min. Para testar o vencimento de verdade, o teste antecipa o
// vencimento direto no banco descartável do e2e (E2E_DATABASE_URL, o mesmo do backend) com
// o Python do backend. Sem a variável, os testes que precisam disso são pulados.
export const PODE_VENCER_PIX = !!process.env.E2E_DATABASE_URL;

export function vencerPix(pedidoId: number, minutosAtras = 1) {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'Back-end');
  const backend = process.env.E2E_BACKEND_DIR ?? raiz;
  const python =
    process.platform === 'win32'
      ? path.join(backend, '.venv', 'Scripts', 'python.exe')
      : path.join(backend, '.venv', 'bin', 'python');
  const script = [
    'import os, sys, psycopg',
    "url = os.environ['E2E_DATABASE_URL'].replace('postgresql+psycopg://', 'postgresql://')",
    'with psycopg.connect(url, autocommit=True) as c:',
    "    c.execute('UPDATE pedidos SET pix_expira_em = now() - make_interval(mins => %s) WHERE id = %s',"
    + ' (int(sys.argv[2]), int(sys.argv[1])))',
  ].join('\n');
  execFileSync(python, ['-c', script, String(pedidoId), String(minutosAtras)], { env: process.env });
}
