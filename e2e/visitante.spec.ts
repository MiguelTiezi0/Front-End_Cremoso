import { ACEITE, API_URL, CLIENTE, RUN, apiToken, expect, loginUI, test } from './fixtures';

// O <label>Telefone</label> agora está associado ao input (id/name).
const telefoneInput = (page: import('@playwright/test').Page) => page.getByLabel('Telefone');

async function preencherCadastro(
  page: import('@playwright/test').Page,
  dados: { nome: string; email: string; telefone: string; senha: string },
) {
  await page.goto('/cadastro');
  await page.getByLabel('Nome completo').fill(dados.nome);
  await page.getByLabel('E-mail').fill(dados.email);
  await telefoneInput(page).pressSequentially(dados.telefone);
  await page.getByLabel('Senha', { exact: true }).fill(dados.senha);
  await page.getByLabel('Confirmar senha').fill(dados.senha);
  await page.getByLabel(/Li e aceito a política de privacidade/).check();
  await page.getByRole('button', { name: 'Criar conta' }).click();
}

test.describe('Visitante', () => {
  test('catálogo é público; as telas da conta pedem login', async ({ page, obs }) => {
    // Entrega 2: cardápio, produto e carrinho abrem sem login (o login fica no checkout).
    await page.goto('/');
    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
    for (const rota of ['/dashboard', '/pedidos', '/pontos', '/checkout']) {
      await page.goto(rota);
      await expect(page, rota).toHaveURL(/\/login$/);
    }
    expect(obs.httpErrors).toEqual([]);
  });

  test('cadastro com sucesso entra no dashboard', async ({ page, obs }) => {
    await preencherCadastro(page, {
      nome: 'Visitante Novo',
      email: `novo${RUN}@teste.com`,
      telefone: '11987654321',
      senha: 'Senha123',
    });

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Olá, Visitante')).toBeVisible();
    expect(obs.httpErrors.filter((e) => e.includes('/auth/register'))).toEqual([]);
  });

  test('cadastro com e-mail já existente mostra a mensagem do 409', async ({ page, obs }) => {
    await preencherCadastro(page, {
      nome: 'Outro Cliente',
      email: CLIENTE.email,
      telefone: '11987654321',
      senha: 'Senha123',
    });

    await expect(page.getByRole('alert')).toHaveText('Já existe uma conta com este e-mail.');
    expect(obs.httpErrors).toContain('POST /auth/register -> 409');
  });

  test('cadastro recusado pelo back mostra a mensagem do 400', async ({ page, obs }) => {
    // Nome com mais de 100 caracteres: o front não limita o tamanho, o back recusa.
    await preencherCadastro(page, {
      nome: 'N'.repeat(101),
      email: `longo${RUN}@teste.com`,
      telefone: '11987654321',
      senha: 'Senha123',
    });

    await expect(page.getByRole('alert')).toHaveText('Nome deve ter no máximo 100 caracteres.');
    expect(obs.httpErrors).toContain('POST /auth/register -> 400');
  });

  test('item 7: e-mail com domínio longo é aceito e o telefone é salvo normalizado', async ({
    page,
    request,
  }) => {
    const email = `loja${RUN}@sorveteria.store`;
    await preencherCadastro(page, {
      nome: 'Domínio Longo',
      email,
      telefone: '11987654321',
      senha: 'Senha123',
    });
    await expect(page).toHaveURL(/\/dashboard$/);

    const me = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${await apiToken(request, email, 'Senha123')}` },
    });
    expect(await me.json()).toMatchObject({ email, telefone: '(11) 98765-4321' });

    // .online também passa no front e no back
    const online = await request.post(`${API_URL}/auth/register`, {
      data: { nome: 'Online', email: `x${RUN}@cremoso.online`, telefone: '11 98765 4321', senha: 'Senha123', ...ACEITE },
    });
    expect(online.status()).toBe(200);
  });

  test('item 7: telefone fixo e senha sem número são barrados pelo front com as regras do back', async ({
    page,
    obs,
  }) => {
    await page.goto('/cadastro');
    await page.getByLabel('Nome completo').fill('Regras Iguais');
    await page.getByLabel('E-mail').fill(`regras${RUN}@teste.com`);
    await telefoneInput(page).pressSequentially('1134567890'); // fixo: 10 dígitos
    await page.getByLabel('Senha', { exact: true }).fill('somenteletras');
    await page.getByLabel('Confirmar senha').fill('somenteletras');
    await page.getByLabel(/Li e aceito a política de privacidade/).check();
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByText('Informe um celular com DDD, ex.: (11) 91234-5678')).toBeVisible();
    await expect(page.getByText('Inclua ao menos um número')).toBeVisible();
    expect(obs.httpErrors).toEqual([]); // nem chega a chamar a API

    // E o back recusa as mesmas entradas com as mensagens dele
    const r = await page.request.post(`${API_URL}/auth/register`, {
      data: { nome: 'Regras Iguais', email: `regras${RUN}@teste.com`, telefone: '(11) 3456-7890', senha: 'Senha123', ...ACEITE },
    });
    expect(r.status()).toBe(400);
    expect(await r.json()).toEqual({
      message: 'Telefone inválido. Informe um celular com DDD, ex.: (11) 91234-5678',
    });
    const s = await page.request.post(`${API_URL}/auth/register`, {
      data: { nome: 'Regras Iguais', email: `regras${RUN}@teste.com`, telefone: '11987654321', senha: 'somenteletras', ...ACEITE },
    });
    expect(await s.json()).toEqual({ message: 'Senha deve conter pelo menos uma letra e um número.' });
  });

  test('login mostra o bloco "Contas de teste" (sem "mock") em modo dev', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Contas de teste', { exact: true })).toBeVisible();
    await expect(page.getByText(/mock/i)).toHaveCount(0);
  });

  test('com a API real (VITE_USE_MOCK=false) não aparece o aviso "Modo demonstração"', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Entrar', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Modo demonstração')).toHaveCount(0);
  });

  test('cadastro com dados inválidos é barrado pela validação do front', async ({ page, obs }) => {
    await page.goto('/cadastro');
    await page.getByLabel('Nome completo').fill('Al');
    await page.getByLabel('E-mail').fill('sem-arroba');
    await page.getByLabel('Senha', { exact: true }).fill('123');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByText('Informe seu nome completo')).toBeVisible();
    await expect(page.getByText('E-mail inválido')).toBeVisible();
    expect(obs.httpErrors).toEqual([]); // nem chega a chamar a API
  });

  test('login com o cliente de teste', async ({ page, obs }) => {
    await loginUI(page, CLIENTE.email, CLIENTE.senha);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Olá, Cliente')).toBeVisible();
    expect(obs.httpErrors.filter((e) => e.includes('/auth/login'))).toEqual([]);
  });

  test('login com senha errada mostra a mensagem do 401', async ({ page, obs }) => {
    await loginUI(page, CLIENTE.email, 'SenhaErrada1');

    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
    await expect(page).toHaveURL(/\/login$/);
    expect(obs.httpErrors).toContain('POST /auth/login -> 401');
  });
});
