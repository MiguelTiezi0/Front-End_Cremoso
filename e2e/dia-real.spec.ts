import type { APIRequestContext, Page } from '@playwright/test';
import {
  ADMIN,
  API_URL,
  PODE_VENCER_PIX,
  RUN,
  abaDoPainel,
  abrirPainel,
  apiCriarCategoria,
  apiCriarPedido,
  apiCriarProduto,
  apiNovoCliente,
  apiToken,
  botaoNoPainel,
  cancelarNoPainel,
  cardDoPedido,
  confirmarPixNoPainel,
  expect,
  loginUI,
  test,
  vencerPix,
} from './fixtures';

// "Dia real" da loja (Etapa 5): o cliente no celular (390×844) e a loja no tablet do balcão
// (820×1180), contra a API real com o seed de dev, num banco descartável. Cada cenário usa
// contas e produtos novos.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const TABLET = { width: 820, height: 1180 };

interface Produto {
  id: number;
  descricao: string;
}

let admin: string;
let categoriaId: number;

test.beforeAll(async ({ request }) => {
  admin = await apiToken(request, ADMIN.email, ADMIN.senha);
  categoriaId = (await apiCriarCategoria(request, admin, `Dia Real ${RUN}`)).id;
});

const novoProduto = (request: APIRequestContext, nome: string, preco = 18.9): Promise<Produto> =>
  apiCriarProduto(request, admin, categoriaId, `${nome} ${RUN}`, preco); // 19 pontos por unidade

const descricaoStatus = (page: Page) => page.getByTestId('descricao-status');

/** Cliente: avança o relógio além dos 15 s do polling da tela do pedido. */
const esperarPolling = (page: Page) => page.clock.fastForward('00:16');

async function clienteComConta(page: Page, request: APIRequestContext, prefixo: string) {
  const conta = await apiNovoCliente(request, prefixo);
  await loginUI(page, conta.email, conta.senha);
  await expect(page).toHaveURL(/\/dashboard$/);
  return { ...conta, token: await apiToken(request, conta.email, conta.senha) };
}

async function pedirRetirada(page: Page, produto: Produto, vezes = 1) {
  await page.goto('/catalogo');
  const botao = page.getByRole('button', { name: `Adicionar ${produto.descricao} ao carrinho` });
  for (let i = 0; i < vezes; i++) await botao.click();
  await page.goto('/checkout');
  await page.getByRole('button', { name: /Fazer pedido · R\$/ }).click();
  await expect(page).toHaveURL(/\/pedidos\/\d+$/);
  return Number(page.url().split('/').pop());
}

test.describe('Dia real', () => {
  test('a+b. visitante faz um pedido de retirada e a loja leva até o fim; pontos uma vez só', async ({
    page,
    request,
    browser,
  }, testInfo) => {
    test.setTimeout(180_000);
    const produto = await novoProduto(request, 'Pistache Real');
    await page.clock.install();

    // O painel já está aberto no balcão, antes do pedido chegar.
    const painel = await abrirPainel(browser, testInfo, '/admin/pedidos', {
      viewport: TABLET,
      preparar: (p) => p.clock.install(),
    });

    // a. Visitante: cardápio sem login, carrinho com observação por item.
    await page.goto('/catalogo');
    await expect(page.getByTestId('status-loja')).toContainText('Aberto agora');
    const adicionar = page.getByRole('button', { name: `Adicionar ${produto.descricao} ao carrinho` });
    await adicionar.click();
    await adicionar.click();
    await page.goto('/carrinho');
    await page.getByLabel(`Observação para ${produto.descricao}`).fill('sem calda');
    await page.getByRole('button', { name: 'Entrar e finalizar' }).click();

    // Cadastro no checkout, aceitando os termos; volta para o checkout com o carrinho.
    await expect(page).toHaveURL(/\/login$/);
    await page.getByRole('link', { name: 'Cadastre-se' }).click();
    const email = `diareal${RUN}@teste.com`;
    await page.getByLabel('Nome completo').fill('Marina Real');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Telefone').pressSequentially('11987654321');
    await page.getByLabel('Senha', { exact: true }).fill('Senha123');
    await page.getByLabel('Confirmar senha').fill('Senha123');
    await page.getByLabel(/Li e aceito a política de privacidade/).check();
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    const resumo = page.getByRole('region', { name: 'Resumo do pedido' });
    await expect(resumo).toContainText('Obs.: sem calda');
    await expect(page.getByTestId('total-checkout')).toHaveText('R$ 37,80');
    await expect(resumo).toContainText('Você ganha 38 pts quando o pedido for concluído.');
    await page.getByRole('button', { name: /Fazer pedido · R\$\s37,80/ }).click();
    await expect(page).toHaveURL(/\/pedidos\/\d+$/);
    const id = Number(page.url().split('/').pop());
    await expect(page.getByRole('img', { name: 'QR Code do Pix' })).toBeVisible();
    await expect(page.getByTestId('status-pagamento')).toHaveText('Pix · aguardando pagamento');

    // b. A loja vê o pedido chegar sem recarregar.
    const card = cardDoPedido(painel, id);
    await painel.clock.fastForward('00:11');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Obs.: sem calda');

    await botaoNoPainel(painel, id, 'Aceitar pedido');
    await esperarPolling(page);
    await expect(descricaoStatus(page)).toHaveText('A loja aceitou seu pedido.');

    await abaDoPainel(painel, 'Aceitos');
    await confirmarPixNoPainel(painel, id);
    await esperarPolling(page);
    await expect(page.getByTestId('status-pagamento')).toHaveText('Pix · pagamento confirmado');

    await botaoNoPainel(painel, id, 'Começar preparo');
    await esperarPolling(page);
    await expect(descricaoStatus(page)).toHaveText('Seu pedido está sendo preparado.');

    await abaDoPainel(painel, 'Em preparo');
    await botaoNoPainel(painel, id, 'Pronto para retirada');
    await esperarPolling(page);
    await expect(descricaoStatus(page)).toHaveText('Seu pedido está pronto. Pode vir buscar!');

    // Avisar pelo WhatsApp: número do cliente e mensagem do status.
    await abaDoPainel(painel, 'Prontos');
    const link = card.getByRole('link', { name: 'Avisar cliente no WhatsApp' });
    const href = new URL((await link.getAttribute('href'))!);
    expect(href.origin + href.pathname).toBe('https://wa.me/5511987654321');
    expect(href.searchParams.get('text')).toBe(
      `Olá, Marina! Aqui é da Cremoso. Seu pedido #${id} está pronto para retirada.`,
    );

    await botaoNoPainel(painel, id, 'Concluir (entregue)');
    await esperarPolling(page);
    await expect(descricaoStatus(page)).toHaveText('Pedido concluído. Bom apetite!');
    await expect(page.getByText('38 pts creditados no seu saldo.')).toBeVisible();

    // Pontos exatamente uma vez, mesmo se alguém tentar concluir de novo.
    const token = await apiToken(request, email, 'Senha123');
    const deNovo = await request.post(`${API_URL}/admin/pedidos/${id}/status`, {
      headers: { Authorization: `Bearer ${admin}` },
      data: { para: 'CONCLUIDO', statusAtual: 'CONCLUIDO' },
    });
    expect(deNovo.status()).toBe(409);
    await page.goto('/pontos');
    await expect(page.getByText('38 pts', { exact: true })).toBeVisible();
    const extrato = page.getByRole('list', { name: 'Extrato de pontos' });
    await expect(extrato.getByRole('listitem')).toHaveCount(1);
    await expect(extrato.getByRole('listitem').first()).toContainText('+38');
    const saldo = await (await request.get(`${API_URL}/pontos/saldo`, { headers: { Authorization: `Bearer ${token}` } })).json();
    expect(saldo.saldo).toBe(38);
  });

  test('c. entrega: pedido mínimo antes de finalizar, CEP obrigatório e taxa no total', async ({
    page,
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const barato = await novoProduto(request, 'Picole Real', 6);
    await clienteComConta(page, request, 'entregareal');
    await page.goto('/catalogo');
    await page.getByRole('button', { name: `Adicionar ${barato.descricao} ao carrinho` }).click();
    await page.goto('/checkout');
    await page.getByRole('radio', { name: /Entrega/ }).click();

    await expect(page.getByText(/O pedido mínimo para entrega é R\$\s15,00 \(sem a taxa\)\. Faltam R\$\s9,00\./)).toBeVisible();
    await expect(page.getByRole('button', { name: /Fazer pedido/ })).toBeDisabled();

    await page.goto('/carrinho');
    const mais = page.getByRole('button', { name: `Aumentar quantidade de ${barato.descricao}` });
    await mais.click();
    await mais.click();
    await page.goto('/checkout');
    await page.getByRole('radio', { name: /Entrega/ }).click();
    await expect(page.getByTestId('total-checkout')).toHaveText('R$ 26,00'); // 18 + 8 de taxa

    await page.getByRole('button', { name: /Fazer pedido/ }).click();
    await expect(page.getByText('Informe o CEP (8 dígitos).')).toBeVisible();
    await page.getByLabel('CEP').fill('15900000');
    await page.getByLabel('Rua').fill('Rua das Flores');
    await page.getByLabel('Número').fill('123');
    await page.getByLabel('Bairro').fill('Centro');
    await page.getByRole('button', { name: /Fazer pedido/ }).click();
    await expect(page).toHaveURL(/\/pedidos\/\d+$/);
    const id = Number(page.url().split('/').pop());

    const painel = await abrirPainel(browser, testInfo, '/admin/pedidos', { viewport: TABLET });
    const card = cardDoPedido(painel, id);
    await expect(card).toContainText('Rua das Flores, 123 · Centro · CEP 15900-000');
    await expect(card).toContainText('Entrega');
    await expect(card).toContainText('R$ 26,00');
  });

  test('d. Pix vencido: dentro da janela a loja confirma; fora da janela não dá', async ({
    request,
    browser,
  }, testInfo) => {
    test.skip(!PODE_VENCER_PIX, 'precisa de E2E_DATABASE_URL para vencer o Pix sem esperar 15 min');
    test.slow();
    const produto = await novoProduto(request, 'Vencido Real');
    const conta = await apiNovoCliente(request, 'vencido');
    const token = await apiToken(request, conta.email, conta.senha);
    const dentro = await apiCriarPedido(request, token, [{ produtoId: produto.id, quantidade: 1 }]);
    const fora = await apiCriarPedido(request, token, [{ produtoId: produto.id, quantidade: 1 }]);
    vencerPix(dentro.id, 1); // venceu há 1 min: ainda dá
    vencerPix(fora.id, 125); // venceu há 2 h 05: acabou o prazo

    const painel = await abrirPainel(browser, testInfo, '/admin/pedidos', { viewport: TABLET });
    const secao = painel.getByRole('region', { name: 'Pix vencido — ainda dá pra confirmar' });
    await expect(secao.getByRole('article', { name: `Pedido #${dentro.id}` })).toBeVisible();
    await expect(cardDoPedido(painel, fora.id)).toHaveCount(0); // sem botão para confirmar

    await confirmarPixNoPainel(painel, dentro.id);
    await expect(secao.getByRole('article', { name: `Pedido #${dentro.id}` })).toHaveCount(0);
    await expect(cardDoPedido(painel, dentro.id)).toBeVisible(); // de volta à fila (Novos)

    const r = await request.post(`${API_URL}/admin/pedidos/${fora.id}/pagamento`, {
      headers: { Authorization: `Bearer ${admin}` },
      data: { status: 'CONFIRMADO' },
    });
    expect(r.status()).toBe(409);
    expect((await r.json()).codigo).toBe('PEDIDO_EXPIRADO');
  });

  test('e. pago e cancelado pela loja, marcado DEVOLVIDO: o cliente vê "Pagamento devolvido"', async ({
    page,
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Devolve Real');
    await page.clock.install();
    await clienteComConta(page, request, 'devolvereal');
    const id = await pedirRetirada(page, produto);

    const painel = await abrirPainel(browser, testInfo, '/admin/pedidos', { viewport: TABLET });
    await confirmarPixNoPainel(painel, id);
    await cancelarNoPainel(painel, id, 'Acabou o pistache');
    const card = painel.getByRole('region', { name: 'Devolver ao cliente' }).getByRole('article', { name: `Pedido #${id}` });
    await card.getByRole('button', { name: 'Marcar como DEVOLVIDO' }).click();
    await card.getByRole('button', { name: 'Sim, já devolvi' }).click();
    await expect(card).toHaveCount(0);

    await esperarPolling(page);
    const aviso = page.getByRole('status').filter({ hasText: 'Pagamento devolvido' });
    await expect(aviso).toContainText('A loja devolveu R$ 18,90 para você pelo Pix.');
  });

  test('f. produto marcado esgotado no painel fica travado no carrinho do cliente', async ({
    page,
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Esgota Real');
    await page.goto('/catalogo');
    await page.getByRole('button', { name: `Adicionar ${produto.descricao} ao carrinho` }).click();

    const painel = await abrirPainel(browser, testInfo, '/admin/produtos', { viewport: TABLET });
    const botao = painel.getByRole('button', { name: `Esgotado: ${produto.descricao}` });
    await botao.click();
    await expect(botao).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/carrinho');
    await expect(page.getByRole('alert').filter({ hasText: 'Seu carrinho mudou' })).toContainText(
      `${produto.descricao} esgotou`,
    );
    await expect(page.getByRole('button', { name: 'Entrar e finalizar' })).toBeDisabled();
    await page.goto('/catalogo');
    await expect(page.getByRole('button', { name: `${produto.descricao} esgotado` })).toBeDisabled();
  });

  test('g. loja fora do horário e loja sem Pix: o cardápio avisa e a API recusa', async ({ page, request }) => {
    test.slow();
    const headers = { Authorization: `Bearer ${admin}` };
    const original = await (await request.get(`${API_URL}/admin/loja`, { headers })).json();
    const { pausada: _p, pixExemplo: _e, ...config } = original;
    const produto = await novoProduto(request, 'Fechado Real');
    const conta = await apiNovoCliente(request, 'fechado');
    const token = await apiToken(request, conta.email, conta.senha);
    const tentarPedido = async () => {
      const r = await request.post(`${API_URL}/pedidos`, {
        headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': crypto.randomUUID() },
        data: { tipoEntrega: 'RETIRADA', formaPagamento: 'PIX', itens: [{ produtoId: produto.id, quantidade: 1 }] },
      });
      expect(r.status()).toBe(409);
      return (await r.json()).codigo;
    };

    // Abre só daqui a dois dias, das 10h às 11h (dia da semana da loja: 0 = segunda).
    const dias = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hoje = dias.indexOf(
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(new Date()),
    );
    const fechada = { ...config, horarios: [{ diaSemana: (hoje + 2) % 7, abre: '10:00', fecha: '11:00' }] };
    try {
      expect((await request.put(`${API_URL}/admin/loja`, { headers, data: fechada })).ok()).toBeTruthy();
      await page.goto('/catalogo');
      await expect(page.getByTestId('status-loja')).toContainText(/Fechado, abre .+ às 10:00/);
      expect(await tentarPedido()).toBe('LOJA_FECHADA');

      const semPix = { ...config, pixChave: null, pixNomeRecebedor: null, pixCidade: null };
      expect((await request.put(`${API_URL}/admin/loja`, { headers, data: semPix })).ok()).toBeTruthy();
      await page.reload();
      await expect(page.getByTestId('status-loja')).toContainText('A loja ainda não está recebendo pedidos pelo app.');
      expect(await tentarPedido()).toBe('PAGAMENTO_INDISPONIVEL');
    } finally {
      await request.put(`${API_URL}/admin/loja`, { headers, data: config });
    }
  });

  test('h. cliente A não vê o pedido do cliente B, e cliente não entra no painel', async ({ page, request }) => {
    test.slow();
    const produto = await novoProduto(request, 'Privado Real');
    const contaB = await apiNovoCliente(request, 'clienteb');
    const tokenB = await apiToken(request, contaB.email, contaB.senha);
    const pedidoB = await apiCriarPedido(request, tokenB, [{ produtoId: produto.id, quantidade: 1 }]);

    const a = await clienteComConta(page, request, 'clientea');
    await page.goto(`/pedidos/${pedidoB.id}`);
    await expect(page.getByText('Pedido não encontrado.')).toBeVisible();
    await page.goto('/pedidos');
    await expect(page.getByRole('heading', { name: 'Meus pedidos' })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(`Pedido #${pedidoB.id}\\b`) })).toHaveCount(0);

    const comA = { Authorization: `Bearer ${a.token}` };
    expect((await request.get(`${API_URL}/pedidos/${pedidoB.id}`, { headers: comA })).status()).toBe(404);
    expect((await request.post(`${API_URL}/pedidos/${pedidoB.id}/cancelar`, { headers: comA })).status()).toBe(404);

    // Painel: a tela manda de volta e a API recusa.
    await page.goto('/admin/pedidos');
    await expect(page).toHaveURL(/\/dashboard$/);
    expect((await request.get(`${API_URL}/admin/pedidos`, { headers: comA })).status()).toBe(403);
    expect(
      (await request.post(`${API_URL}/admin/pedidos/${pedidoB.id}/status`, {
        headers: comA,
        data: { para: 'ACEITO', statusAtual: 'RECEBIDO' },
      })).status(),
    ).toBe(403);
  });
});
