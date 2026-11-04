import { createHmac } from 'node:crypto';
import {
  ADMIN,
  API_URL,
  CLIENTE,
  RUN,
  apiCriarCategoria,
  apiCriarProduto,
  apiToken,
  expect,
  loginUI,
  test,
  toast,
} from './fixtures';

function jwtHS256(payload: Record<string, unknown>, segredo: string) {
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const corpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
  return `${corpo}.${createHmac('sha256', segredo).update(corpo).digest('base64url')}`;
}

test.describe('Cliente', () => {
  test('dados do usuário e saldo de pontos aparecem após o login', async ({ page }) => {
    await loginUI(page, CLIENTE.email, CLIENTE.senha);

    await expect(page.getByText('Olá, Cliente')).toBeVisible();
    await expect(page.getByText('Saldo de pontos')).toBeVisible();
    await expect(page.getByText('0 pts', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Menu do usuário' }).click();
    await expect(page.getByText(CLIENTE.email)).toBeVisible();
  });

  test('ao recarregar a página o front busca os dados atualizados em /auth/me', async ({ page }) => {
    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page).toHaveURL(/\/dashboard$/);

    const chamouMe = page
      .waitForRequest((req) => req.url() === `${API_URL}/auth/me`, { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    await page.reload();

    // Sem isso o saldo de pontos/nome ficam congelados no valor do login (localStorage).
    expect(await chamouMe, 'GET /auth/me não foi chamado no carregamento').toBe(true);
  });

  test('item 4: /auth/me no carregamento atualiza nome e telefone no contexto e no storage', async ({
    page,
    request,
  }) => {
    const email = `sessao${RUN}@teste.com`;
    await request.post(`${API_URL}/auth/register`, {
      data: { nome: 'Sessao Antiga', email, telefone: '11911110000', senha: 'Senha123' },
    });
    await loginUI(page, email, 'Senha123');
    await expect(page.getByText('Olá, Sessao')).toBeVisible();

    // Dados mudam fora desta aba (outro dispositivo, admin...)
    const token = await apiToken(request, email, 'Senha123');
    const put = await request.put(`${API_URL}/clientes/me`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: 'Renomeado Fora', email, telefone: '11922220000' },
    });
    expect(put.ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByText('Olá, Renomeado')).toBeVisible();
    const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem('cremoso.user')!));
    expect(salvo).toMatchObject({ nome: 'Renomeado Fora', telefone: '(11) 92222-0000' });
  });

  test('item 4: enquanto valida a sessão mostra o loader, sem piscar o dashboard', async ({ page }) => {
    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page.getByText('Olá, Cliente')).toBeVisible();

    // Segura a resposta de /auth/me até o teste liberar.
    let liberar!: () => void;
    const travado = new Promise<void>((r) => (liberar = r));
    await page.route(`${API_URL}/auth/me`, async (route) => {
      await travado;
      await route.continue();
    });

    const pedido = page.waitForRequest(`${API_URL}/auth/me`);
    await page.reload();
    await pedido;
    await expect(page.getByText('Carregando…')).toBeVisible();
    await expect(page.getByText('Olá, Cliente')).toHaveCount(0);
    await expect(page.getByText('Destaques de hoje')).toHaveCount(0);

    liberar();
    await expect(page.getByText('Olá, Cliente')).toBeVisible();
    await expect(page.getByText('Carregando…')).toHaveCount(0);
  });

  test('dashboard do cliente mostra os produtos em destaque', async ({ page, request, obs }) => {
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const categoria = await apiCriarCategoria(request, admin, `Destaques ${RUN}`);
    await apiCriarProduto(request, admin, categoria.id, `Destaque ${RUN}`);

    // Destaques = os 4 produtos ativos com estoque mais recentes (id decrescente).
    const ativos = await (
      await request.get(`${API_URL}/produtos/ativos`, { headers: { Authorization: `Bearer ${admin}` } })
    ).json();
    const esperados = (ativos as { id: number; descricao: string; quantidade: number }[])
      .filter((p) => p.quantidade > 0)
      .sort((a, b) => b.id - a.id)
      .slice(0, 4)
      .map((p) => p.descricao);
    expect(esperados).toContain(`Destaque ${RUN}`); // o recém-criado é o mais recente

    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page.getByText('Destaques de hoje')).toBeVisible();

    const cards = page.locator('section', { hasText: 'Destaques de hoje' }).getByRole('heading', { level: 3 });
    await expect(cards).toHaveText(esperados); // mesmos produtos, na mesma ordem
    await expect(page.getByText('Nenhum destaque hoje')).toHaveCount(0);
    expect(obs.pageErrors).toEqual([]);
  });

  test('item 3: sem produtos ativos mostra "Nenhum destaque hoje"', async ({ page }) => {
    await page.route(`${API_URL}/produtos/ativos`, (route) => route.fulfill({ json: [] }));
    await loginUI(page, CLIENTE.email, CLIENTE.senha);

    await expect(page.getByRole('heading', { name: 'Nenhum destaque hoje' })).toBeVisible();
  });

  test('item 2: se os produtos falharem, o dashboard mostra o erro sem exceção JS', async ({
    page,
    obs,
  }) => {
    await page.route(`${API_URL}/produtos/ativos`, (route) =>
      route.fulfill({ status: 500, json: { message: 'Erro interno no servidor.' } }),
    );
    await loginUI(page, CLIENTE.email, CLIENTE.senha);

    await expect(page.getByRole('alert')).toContainText('Erro interno no servidor.');
    await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    // O resto do dashboard continua de pé.
    await expect(page.getByText('Saldo de pontos')).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(obs.pageErrors).toEqual([]);
  });

  test('item 3: "Ver catálogo" abre o catálogo de produtos ativos', async ({ page, request }) => {
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const categoria = await apiCriarCategoria(request, admin, `Catalogo ${RUN}`);
    await apiCriarProduto(request, admin, categoria.id, `No Catalogo ${RUN}`);

    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await page.getByRole('link', { name: 'Ver catálogo' }).click();

    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: `No Catalogo ${RUN}` })).toBeVisible();
  });

  test('item 5: produto com pontos nulos mostra "—" e placeholder no card do cliente', async ({
    page,
    request,
  }) => {
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const categoria = await apiCriarCategoria(request, admin, `Nulos Card ${RUN}`);
    const res = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${admin}` },
      data: {
        descricao: `Card Nulo ${RUN}`, quantidade: 5, preco: 9.5, ativo: true,
        categoriaId: categoria.id, imagemUrl: null, precoEmPontos: null, ganhoDePontos: null,
      },
    });
    expect(res.status()).toBe(201);

    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page).toHaveURL(/\/dashboard$/); // espera o login terminar antes de navegar
    await page.goto('/catalogo');
    const card = page.locator('.card').filter({ has: page.getByRole('heading', { name: `Card Nulo ${RUN}` }) });

    await expect(card).toContainText('R$ 9,50');
    await expect(card.getByTitle('Pontos ganhos na compra')).toHaveText('—');
    await expect(card.getByTitle('Preço em pontos')).toHaveText('—');
    await expect(card.getByTestId('imagem-placeholder')).toBeVisible();
    await expect(card).not.toContainText(/null|NaN|undefined/);
  });

  test('modo misto: resgate de pontos (mock) funciona com usuário e produto da API real', async ({
    page,
    request,
    obs,
  }) => {
    // Produto real com preço em pontos.
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const categoria = await apiCriarCategoria(request, admin, `Resgate ${RUN}`);
    const produto = await apiCriarProduto(request, admin, categoria.id, `Resgatavel ${RUN}`);

    // Conta real nova. A API ainda não tem pontos (todo cliente tem 0), então simulamos só o
    // saldo que viria de /auth/me; o resto (login, produtos) é a API real.
    const email = `pontos${RUN}@teste.com`;
    await request.post(`${API_URL}/auth/register`, {
      data: { nome: 'Pontos Misto', email, telefone: '11933334444', senha: 'Senha123' },
    });
    await page.route(`${API_URL}/auth/me`, async (route) => {
      const res = await route.fetch();
      route.fulfill({ response: res, json: { ...(await res.json()), saldoPontos: 500 } });
    });

    await loginUI(page, email, 'Senha123');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/pontos');

    const card = page.locator('.card').filter({ has: page.getByRole('heading', { name: produto.descricao }) });
    await card.getByRole('button', { name: 'Resgatar' }).click();
    await page.getByRole('dialog', { name: 'Confirmar resgate' }).getByRole('button', { name: 'Resgatar' }).click();

    await expect(toast(page, `Resgate de "${produto.descricao}" realizado!`)).toBeVisible();
    await expect(page.getByText('Usuário não encontrado.')).toHaveCount(0);
    await expect(page.getByText(`Resgate: ${produto.descricao}`)).toBeVisible(); // extrato do usuário
    await expect(page.getByText('310 pts', { exact: true }).first()).toBeVisible(); // 500 - 190
    expect(obs.pageErrors).toEqual([]);
  });

  test('navegar como cliente não gera erros de API nem exceções JS', async ({ page, obs }) => {
    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'Meu perfil' })).toBeVisible();
    await page.waitForLoadState('networkidle');

    expect(obs.requestFailed, 'requisições bloqueadas (CORS/rede)').toEqual([]);
    expect(obs.httpErrors, 'respostas de erro da API').toEqual([]);
    expect(obs.pageErrors, 'exceções JS não tratadas').toEqual([]);
  });

  test('editar perfil (nome, telefone e senha) e logar com a nova senha', async ({
    page,
    request,
    obs,
  }) => {
    const email = `perfil${RUN}@teste.com`;
    const reg = await request.post(`${API_URL}/auth/register`, {
      data: { nome: 'Perfil Original', email, telefone: '(11) 91111-1111', senha: 'Senha123' },
    });
    expect(reg.ok()).toBeTruthy();

    await loginUI(page, email, 'Senha123');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/perfil');

    await page.getByLabel('Nome completo').fill('Perfil Alterado');
    const tel = page.getByLabel('Telefone');
    await tel.fill('');
    await tel.pressSequentially('11922223333');
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha9');
    await page.getByLabel('Confirmar nova senha').fill('NovaSenha9');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(toast(page, 'Perfil atualizado com sucesso!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu do usuário' })).toContainText('Perfil');
    expect(obs.httpErrors.filter((e) => e.includes('/clientes/me'))).toEqual([]);

    // Logout e login com a senha nova
    await page.getByRole('button', { name: 'Menu do usuário' }).click();
    await page.getByRole('button', { name: 'Sair' }).click();
    await loginUI(page, email, 'Senha123');
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
    await loginUI(page, email, 'NovaSenha9');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Olá, Perfil')).toBeVisible();

    const me = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${await apiToken(request, email, 'NovaSenha9')}` },
    });
    expect(await me.json()).toMatchObject({ nome: 'Perfil Alterado', telefone: '(11) 92222-3333' });
  });

  test('item 7: nova senha fraca no perfil é barrada com a regra do cadastro', async ({ page }) => {
    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/perfil');

    await page.getByLabel('Nova senha', { exact: true }).fill('12345678');
    await page.getByLabel('Confirmar nova senha').fill('12345678');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page.getByText('Inclua ao menos uma letra')).toBeVisible();
  });

  test('editar perfil com e-mail de outra conta mostra a mensagem do 409', async ({
    page,
    request,
    obs,
  }) => {
    const email = `conflito${RUN}@teste.com`;
    await request.post(`${API_URL}/auth/register`, {
      data: { nome: 'Conflito Teste', email, telefone: '(11) 91111-1111', senha: 'Senha123' },
    });
    await loginUI(page, email, 'Senha123');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/perfil');

    await page.getByLabel('E-mail').fill(ADMIN.email);
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(toast(page, 'Este e-mail já está em uso por outra conta.')).toBeVisible();
    expect(obs.httpErrors).toContain('PUT /clientes/me -> 409');
  });

  test('telas de admin ficam bloqueadas para o cliente', async ({ page, request }) => {
    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByRole('link', { name: 'Produtos' })).toHaveCount(0);
    await page.goto('/admin/produtos');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/admin/categorias');
    await expect(page).toHaveURL(/\/dashboard$/);

    // Mesmo chamando a API direto com o token do cliente, a escrita é recusada.
    const token = await page.evaluate(() => localStorage.getItem('cremoso.token'));
    const res = await request.post(`${API_URL}/categorias`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { nome: 'Hack', descricao: 'Hack', imagemUrl: '', ativa: true },
    });
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ message: 'Você não tem permissão para executar esta ação.' });
  });

  test('logout remove a sessão e bloqueia rotas protegidas', async ({ page }) => {
    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole('button', { name: 'Menu do usuário' }).click();
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login$/);

    const storage = await page.evaluate(() => ({
      token: localStorage.getItem('cremoso.token') ?? sessionStorage.getItem('cremoso.token'),
      user: localStorage.getItem('cremoso.user') ?? sessionStorage.getItem('cremoso.user'),
    }));
    expect(storage).toEqual({ token: null, user: null });

    await page.goto('/perfil');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('token inválido desloga e volta para o login', async ({ page }) => {
    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.evaluate(() => localStorage.setItem('cremoso.token', 'token-adulterado'));
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('cremoso.token'))).toBeNull();
  });

  test('token expirado desloga e volta para o login', async ({ page }) => {
    const segredo = process.env.E2E_JWT_SECRET;
    test.skip(!segredo, 'Defina E2E_JWT_SECRET (o JWT_SECRET do backend) para gerar um token expirado.');

    await loginUI(page, CLIENTE.email, CLIENTE.senha);
    await expect(page).toHaveURL(/\/dashboard$/);
    const user = await page.evaluate(() => JSON.parse(localStorage.getItem('cremoso.user')!));
    const passado = Math.floor(Date.now() / 1000) - 7200;
    const expirado = jwtHS256(
      { sub: user.email, id: user.id, role: user.role, iat: passado, exp: passado + 3600 },
      segredo!,
    );

    await page.evaluate((t) => localStorage.setItem('cremoso.token', t), expirado);
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
  });
});
