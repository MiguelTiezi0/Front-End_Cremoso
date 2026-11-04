import { expect, test, type Page } from '@playwright/test';

// Cenário "modo demonstração": Vite com VITE_USE_MOCK=true (projeto `demonstracao`,
// porta 5174). Tudo roda no mock em memória: todos os módulos aparecem e nenhuma
// chamada vai para a API. Contas do seed do mock (src/api/mock/seed.ts).

const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api';

function contarChamadasApi(page: Page): string[] {
  const chamadas: string[] = [];
  page.on('request', (r) => r.url().startsWith(new URL(API).origin) && chamadas.push(r.url()));
  return chamadas;
}

async function entrar(page: Page, email: string, senha: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('Modo demonstração (VITE_USE_MOCK=true)', () => {
  test('mostra o aviso "Modo demonstração" e não chama a API', async ({ page }) => {
    const chamadas = contarChamadasApi(page);
    await page.goto('/login');

    await expect(page.getByRole('note').filter({ hasText: 'Modo demonstração' })).toBeVisible();
    await entrar(page, 'admin@cremoso.com', 'Admin@123');
    await expect(page.getByText('Painel administrativo')).toBeVisible();
    await expect(page.getByText('Modo demonstração')).toBeVisible();
    expect(chamadas).toEqual([]);
  });

  test('cliente vê todos os módulos: menu, sino, pedidos, endereços e notificações', async ({ page }) => {
    const chamadas = contarChamadasApi(page);
    await entrar(page, 'cliente@cremoso.com', 'Senha@123');

    const nav = page.getByRole('navigation').first();
    await expect(nav.getByRole('link', { name: 'Pedidos' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Pontos' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Notificações/ })).toBeVisible();
    await expect(page.getByText(/Último pedido/)).toBeVisible();

    await page.getByRole('button', { name: 'Menu do usuário' }).click();
    await expect(page.getByRole('link', { name: 'Endereços' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Meus pedidos' })).toBeVisible();

    await page.goto('/pedidos');
    await expect(page.getByRole('heading', { name: 'Meus pedidos' })).toBeVisible();
    await page.goto('/enderecos');
    await expect(page.getByRole('heading', { name: 'Endereços de entrega' })).toBeVisible();
    await page.goto('/notificacoes');
    await expect(page.getByText('Ops! Essa página derreteu.')).toHaveCount(0);
    await page.goto('/perfil');
    await expect(page.getByText('Histórico de pedidos')).toBeVisible();

    expect(chamadas).toEqual([]);
  });

  test('pontos com extrato e resgate do mock (sem "Em breve")', async ({ page }) => {
    await entrar(page, 'cliente@cremoso.com', 'Senha@123');
    await page.goto('/pontos');

    await expect(page.getByText('Seu saldo atual')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Extrato de pontos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Em breve' })).toHaveCount(0);
    // O seed do mock tem produtos resgatáveis e movimentações no extrato.
    await expect(page.getByRole('button', { name: /Resgatar|Faltam|Esgotado/ }).first()).toBeVisible();
    await expect(page.locator('ul li').first()).toBeVisible();
  });
});
