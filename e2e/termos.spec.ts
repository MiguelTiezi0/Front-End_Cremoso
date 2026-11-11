import { API_URL, RUN, expect, test } from './fixtures';

// Etapa 5: páginas públicas de privacidade e regras dos pontos (rascunhos) e o aceite
// obrigatório no cadastro.

test.describe('Privacidade e regras dos pontos', () => {
  test('as duas páginas são públicas, marcadas como rascunho e com os campos para a loja preencher', async ({
    page,
  }) => {
    await page.goto('/privacidade');
    await expect(page.getByRole('heading', { name: 'Política de privacidade' })).toBeVisible();
    await expect(page.getByRole('note')).toContainText('[REVISAR ANTES DE PUBLICAR]');
    for (const campo of ['[NOME DA LOJA]', '[CNPJ]', '[E-MAIL DE CONTATO]']) {
      await expect(page.getByText(campo, { exact: false }).first(), campo).toBeVisible();
    }
    await expect(page.getByText(/nome, e-mail, celular e senha/)).toBeVisible();
    await expect(page.getByText(/Para apagar a sua conta/)).toBeVisible();

    await page.goto('/regras-pontos');
    await expect(page.getByRole('heading', { name: 'Regras dos pontos' })).toBeVisible();
    await expect(page.getByRole('note')).toContainText('[REVISAR ANTES DE PUBLICAR]');
    await expect(page.getByText('[VALIDADE DOS PONTOS]')).toBeVisible();
    await expect(page.getByText(/ainda não está disponível/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Estorno' })).toBeVisible();
  });

  test('rodapé do cardápio e do cadastro leva às duas páginas', async ({ page }) => {
    await page.goto('/catalogo');
    const rodape = page.getByRole('contentinfo');
    await rodape.getByRole('link', { name: 'Regras dos pontos' }).click();
    await expect(page).toHaveURL(/\/regras-pontos$/);

    await page.goto('/cadastro');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Política de privacidade' }).click();
    await expect(page).toHaveURL(/\/privacidade$/);
  });

  test('sem marcar o aceite o cadastro não é enviado; marcando, a conta é criada', async ({ page }) => {
    const envios: string[] = [];
    page.on('request', (r) => r.url() === `${API_URL}/auth/register` && envios.push(r.postData() ?? ''));

    await page.goto('/cadastro');
    await page.getByLabel('Nome completo').fill('Cliente Termos');
    await page.getByLabel('E-mail').fill(`termos${RUN}@teste.com`);
    await page.getByLabel('Telefone').pressSequentially('11987654321');
    await page.getByLabel('Senha', { exact: true }).fill('Senha123');
    await page.getByLabel('Confirmar senha').fill('Senha123');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(
      page.getByText('Para criar a conta, aceite a política de privacidade e as regras dos pontos.'),
    ).toBeVisible();
    expect(envios).toEqual([]);

    // Os links abrem em outra aba, para não perder o formulário.
    await expect(page.getByRole('link', { name: 'política de privacidade', exact: true })).toHaveAttribute('target', '_blank');
    await page.getByLabel(/Li e aceito a política de privacidade/).check();
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(JSON.parse(envios[0])).toMatchObject({ aceiteTermos: true, versaoTermos: expect.any(String) });
  });
});
