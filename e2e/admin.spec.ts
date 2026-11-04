import type { Page } from '@playwright/test';
import {
  ADMIN,
  API_URL,
  RUN,
  apiCriarCategoria,
  apiCriarProduto,
  apiToken,
  expect,
  loginUI,
  test,
  toast,
} from './fixtures';

const IMAGEM = 'http://localhost:5173/icecream.svg'; // servida pelo próprio Vite (sem internet)

async function entrarComoAdmin(page: Page) {
  await loginUI(page, ADMIN.email, ADMIN.senha);
  await expect(page.getByText('Painel administrativo')).toBeVisible();
}

const tokenDaPagina = (page: Page) => page.evaluate(() => localStorage.getItem('cremoso.token'));

const cardCategoria = (page: Page, nome: string) =>
  page.locator('.card').filter({ has: page.getByRole('heading', { name: nome, exact: true }) });

// Só as chamadas desta tela (as de notificações são cobertas no teste do dashboard).
const catalogo = (erro: string) => /\/(categorias|produtos)/.test(erro);

const linhaProduto = (page: Page, descricao: string) =>
  page.locator('tbody tr').filter({ hasText: descricao });

test.describe('Admin — categorias', () => {
  test('criar, editar e excluir categoria pela interface', async ({ page, obs }) => {
    const nome = `Gelatos ${RUN}`;
    await entrarComoAdmin(page);
    await page.goto('/admin/categorias');

    // Criar
    await page.getByRole('button', { name: 'Nova categoria' }).first().click();
    const modal = page.getByRole('dialog', { name: 'Nova categoria' });
    await modal.getByLabel('Nome').fill(nome);
    await modal.getByLabel('Descrição').fill('Gelatos italianos');
    await modal.getByLabel('URL da imagem').fill(IMAGEM);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(toast(page, 'Categoria criada!')).toBeVisible();
    await expect(cardCategoria(page, nome)).toContainText('Gelatos italianos');

    // Editar (inativando)
    await cardCategoria(page, nome).getByRole('button', { name: 'Editar' }).click();
    const edicao = page.getByRole('dialog', { name: 'Editar categoria' });
    await edicao.getByLabel('Descrição').fill('Gelatos da casa');
    await edicao.getByRole('switch', { name: 'Ativa' }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(toast(page, 'Categoria atualizada!')).toBeVisible();
    await expect(cardCategoria(page, nome)).toContainText('Gelatos da casa');
    await expect(cardCategoria(page, nome)).toContainText(/inativ/i);

    // Excluir
    await cardCategoria(page, nome).locator('button.btn-danger').click();
    await page.getByRole('dialog', { name: 'Remover categoria' }).getByRole('button', { name: 'Remover' }).click();
    await expect(toast(page, 'Categoria removida.')).toBeVisible();
    await expect(cardCategoria(page, nome)).toHaveCount(0);

    // Exceções JS do polling de /notificacoes são cobertas no teste de navegação.
    expect(obs.httpErrors.filter(catalogo)).toEqual([]);
  });

  test('excluir categoria com produtos mostra a mensagem do 409', async ({ page, request, obs }) => {
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const nome = `Com Produtos ${RUN}`;
    const categoria = await apiCriarCategoria(request, admin, nome);
    await apiCriarProduto(request, admin, categoria.id, `Produto Preso ${RUN}`);

    await entrarComoAdmin(page);
    await page.goto('/admin/categorias');
    await cardCategoria(page, nome).locator('button.btn-danger').click();
    await page.getByRole('dialog', { name: 'Remover categoria' }).getByRole('button', { name: 'Remover' }).click();

    await expect(toast(page, 'Não é possível excluir: existem produtos nesta categoria.')).toBeVisible();
    await expect(cardCategoria(page, nome)).toHaveCount(1);
    expect(obs.httpErrors).toContain(`DELETE /categorias/${categoria.id} -> 409`);
  });

  test('buscar e listar ativas/inativas (sem tela no front: via API com o token do admin)', async ({
    page,
    request,
  }) => {
    // O front não tem campo de busca nem filtro de ativas/inativas em Categorias;
    // conferimos que os endpoints respondem com a sessão aberta pelo front.
    await entrarComoAdmin(page);
    const headers = { Authorization: `Bearer ${await tokenDaPagina(page)}` };
    const ativa = await apiCriarCategoria(request, headers.Authorization.slice(7), `Busca Ativa ${RUN}`);
    const inativa = await apiCriarCategoria(request, headers.Authorization.slice(7), `Busca Inativa ${RUN}`);
    await request.put(`${API_URL}/categorias/${inativa.id}`, {
      headers,
      data: { ...inativa, ativa: false },
    });

    const busca = await (await request.get(`${API_URL}/categorias/buscar?nome=busca ativa ${RUN}`, { headers })).json();
    const ativas = await (await request.get(`${API_URL}/categorias/ativas`, { headers })).json();
    const inativas = await (await request.get(`${API_URL}/categorias/inativas`, { headers })).json();

    expect(busca.map((c: { id: number }) => c.id)).toEqual([ativa.id]);
    expect(ativas.some((c: { id: number }) => c.id === ativa.id)).toBe(true);
    expect(inativas.some((c: { id: number }) => c.id === inativa.id)).toBe(true);
    expect(ativas.some((c: { id: number }) => c.id === inativa.id)).toBe(false);
  });
});

test.describe('Admin — produtos', () => {
  test('criar, editar, inverter ativo e excluir produto pela interface', async ({
    page,
    request,
    obs,
  }) => {
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const categoria = await apiCriarCategoria(request, admin, `Sorvetes ${RUN}`);
    const descricao = `Pistache ${RUN}`;

    await entrarComoAdmin(page);
    await page.goto('/admin/produtos');

    // Criar
    await page.getByRole('button', { name: 'Novo produto' }).click();
    const modal = page.getByRole('dialog', { name: 'Novo produto' });
    await modal.getByLabel('Descrição').fill(descricao);
    await modal.getByLabel('Categoria').selectOption(String(categoria.id));
    await modal.getByLabel('Preço (R$)').fill('18.90');
    await modal.getByLabel('Quantidade').fill('12');
    await modal.getByLabel('Preço em pontos').fill('190');
    await modal.getByLabel('Ganho de pontos').fill('19');
    await modal.getByLabel('URL da imagem').fill(IMAGEM);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(toast(page, 'Produto criado!')).toBeVisible();

    const linha = linhaProduto(page, descricao);
    await expect(linha).toContainText('R$ 18,90');
    await expect(linha).toContainText(`Sorvetes ${RUN}`);
    await expect(linha).toContainText('190 / +19');
    await expect(linha).toContainText(/Atualizado \d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}/);
    await expect(linha.locator('img')).toHaveAttribute('src', IMAGEM);

    // Editar
    await linha.getByRole('button', { name: 'Editar' }).click();
    const edicao = page.getByRole('dialog', { name: 'Editar produto' });
    await expect(edicao.getByLabel('Preço (R$)')).toHaveValue('18.90'); // item 6: duas casas
    await expect(edicao).toContainText(/Cadastrado em \d{2}\/\d{2}\/\d{4}/);
    await edicao.getByLabel('Preço (R$)').fill('21.5');
    await edicao.getByLabel('Quantidade').fill('0');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(toast(page, 'Produto atualizado!')).toBeVisible();
    await expect(linha).toContainText('R$ 21,50');

    // Inverter ativo
    const toggle = linha.getByRole('switch', { name: `Ativar ${descricao}` });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(linha.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    await linha.getByRole('switch').click();
    await expect(linha.getByRole('switch')).toHaveAttribute('aria-checked', 'true');

    // Excluir
    await linha.getByRole('button', { name: 'Remover' }).click();
    await page.getByRole('dialog', { name: 'Remover produto' }).getByRole('button', { name: 'Remover' }).click();
    await expect(toast(page, 'Produto removido.')).toBeVisible();
    await expect(linhaProduto(page, descricao)).toHaveCount(0);

    // Exceções JS do polling de /notificacoes são cobertas no teste de navegação.
    expect(obs.httpErrors.filter(catalogo)).toEqual([]);
  });

  test('buscar por descrição e filtrar por categoria e status na tela', async ({ page, request }) => {
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const frutas = await apiCriarCategoria(request, admin, `Frutas ${RUN}`);
    const cremes = await apiCriarCategoria(request, admin, `Cremes ${RUN}`);
    await apiCriarProduto(request, admin, frutas.id, `Morango ${RUN}`, 12);
    await apiCriarProduto(request, admin, cremes.id, `Doce de Leite ${RUN}`, 16);

    await entrarComoAdmin(page);
    await page.goto('/admin/produtos');

    await page.getByLabel('Buscar produtos').fill(`morango ${RUN}`);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(linhaProduto(page, `Morango ${RUN}`)).toBeVisible();

    await page.getByLabel('Buscar produtos').fill(RUN);
    await page.getByLabel('Filtrar por categoria').selectOption(String(cremes.id));
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(linhaProduto(page, `Doce de Leite ${RUN}`)).toBeVisible();

    await page.getByLabel('Filtrar por status').selectOption('INATIVOS');
    await expect(page.getByText('Nenhum produto encontrado')).toBeVisible();
  });

  test('filtrar por categoria e por faixa de preço na API (sem filtro de preço no front)', async ({
    page,
    request,
  }) => {
    // A tela filtra no navegador e não tem filtro de preço; conferimos os endpoints
    // /produtos/categoria/{id} e /produtos/preco com a sessão aberta pelo front.
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const categoria = await apiCriarCategoria(request, admin, `Faixa ${RUN}`);
    const barato = await apiCriarProduto(request, admin, categoria.id, `Barato ${RUN}`, 5);
    const caro = await apiCriarProduto(request, admin, categoria.id, `Caro ${RUN}`, 95.5);

    await entrarComoAdmin(page);
    const headers = { Authorization: `Bearer ${await tokenDaPagina(page)}` };

    const porCategoria = await (await request.get(`${API_URL}/produtos/categoria/${categoria.id}`, { headers })).json();
    const faixa = await (await request.get(`${API_URL}/produtos/preco?min=90&max=95.5`, { headers })).json();
    const busca = await (await request.get(`${API_URL}/produtos/buscar?descricao=barato ${RUN}`, { headers })).json();

    expect(porCategoria.map((p: { id: number }) => p.id)).toEqual([barato.id, caro.id]);
    // A faixa é global (o banco pode ter produtos de rodadas anteriores).
    const idsFaixa = faixa.map((p: { id: number }) => p.id);
    expect(idsFaixa).toContain(caro.id);
    expect(idsFaixa).not.toContain(barato.id);
    expect(faixa.every((p: { preco: number }) => p.preco >= 90 && p.preco <= 95.5)).toBe(true);
    expect(busca.map((p: { id: number }) => p.id)).toEqual([barato.id]);
  });

  test('navegar como admin não chama endpoints inexistentes nem gera erros', async ({ page, obs }) => {
    await entrarComoAdmin(page);
    await expect(page.getByText('Produtos ativos')).toBeVisible();
    await expect(page.getByText('Categorias', { exact: true }).last()).toBeVisible();
    await page.waitForLoadState('networkidle');

    expect(obs.httpErrors).toEqual([]);
    expect(obs.pageErrors).toEqual([]);
    expect(obs.consoleErrors).toEqual([]);
  });
});

test.describe('Telas sem valores quebrados', () => {
  const QUEBRADOS = /\b(undefined|null|NaN)\b|Invalid Date|R\$\s*NaN/;

  test('admin: dashboard, produtos, categorias e perfil não exibem undefined/null/NaN', async ({
    page,
    request,
  }) => {
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const categoria = await apiCriarCategoria(request, admin, `Opcionais ${RUN}`);
    // precoEmPontos, ganhoDePontos e imagemUrl são opcionais no contrato da API.
    const res = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${admin}` },
      data: {
        descricao: `Sem Pontos ${RUN}`, quantidade: 3, preco: 7, ativo: true,
        categoriaId: categoria.id, imagemUrl: null, precoEmPontos: null, ganhoDePontos: null,
      },
    });
    expect(res.status()).toBe(201);

    await entrarComoAdmin(page);
    for (const rota of ['/dashboard', '/admin/produtos', '/admin/categorias', '/perfil']) {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
      expect(await page.locator('main').innerText(), `texto de ${rota}`).not.toMatch(QUEBRADOS);
    }

    // Item 5: pontos nulos aparecem como "—" na coluna "Pontos" (não como " / +").
    await page.goto('/admin/produtos');
    const linha = linhaProduto(page, `Sem Pontos ${RUN}`);
    await expect(linha.locator('td').nth(4)).toHaveText('— / —');
    // Item 6: sem imagem → placeholder, nunca o ícone de imagem quebrada.
    await expect(linha.getByTestId('imagem-placeholder')).toBeVisible();

    // Edição de produto com pontos nulos mantém os campos vazios (não vira 0).
    await linha.getByRole('button', { name: 'Editar' }).click();
    const edicao = page.getByRole('dialog', { name: 'Editar produto' });
    await expect(edicao.getByLabel('Preço (R$)')).toHaveValue('7.00');
    await expect(edicao.getByLabel('Preço em pontos')).toHaveValue('');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(toast(page, 'Produto atualizado!')).toBeVisible();
    await expect(linha.locator('td').nth(4)).toHaveText('— / —');
  });

  test('item 6: imagem com URL quebrada vira placeholder na tabela e nos cards mobile', async ({
    page,
    request,
  }) => {
    const admin = await apiToken(request, ADMIN.email, ADMIN.senha);
    const categoria = await apiCriarCategoria(request, admin, `Quebrada ${RUN}`);
    const res = await request.post(`${API_URL}/produtos`, {
      headers: { Authorization: `Bearer ${admin}` },
      data: {
        descricao: `Img Quebrada ${RUN}`, quantidade: 3, preco: 7, ativo: true, categoriaId: categoria.id,
        imagemUrl: 'http://localhost:5173/nao-existe.png', precoEmPontos: 70, ganhoDePontos: 7,
      },
    });
    expect(res.status()).toBe(201);

    await entrarComoAdmin(page);
    await page.goto('/admin/produtos');
    // As imagens são lazy: só são pedidas (e falham) quando a linha chega perto da tela.
    const linha = linhaProduto(page, `Img Quebrada ${RUN}`);
    await linha.scrollIntoViewIfNeeded();
    await expect(linha.getByTestId('imagem-placeholder')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 800 });
    const cardMobile = page.locator('.card').filter({ hasText: `Img Quebrada ${RUN}` });
    // A imagem é lazy: só é pedida (e falha) quando o card chega perto da tela.
    await cardMobile.scrollIntoViewIfNeeded();
    await expect(cardMobile.getByTestId('imagem-placeholder')).toBeVisible();
  });
});
