import type { APIRequestContext, Page } from '@playwright/test';
import {
  ADMIN,
  API_URL,
  RUN,
  apiCriarCategoria,
  apiCriarProduto,
  apiEsgotado,
  apiNovoCliente,
  apiPagamento,
  apiStatus,
  apiToken,
  expect,
  loginUI,
  test,
} from './fixtures';

// Entrega 2 (cliente): cardápio público, carrinho, checkout, tela do pedido, meus pedidos
// e pontos, contra a API real. Requer a loja configurada pelo seed de dev do backend
// (aberta, entrega ligada, taxa R$ 8,00, mínimo R$ 15,00 para entrega, WhatsApp).
// Cada teste usa uma conta nova de cliente para não mexer no saldo das contas do seed.

interface Produto {
  id: number;
  descricao: string;
}

let admin: string;
let categoriaId: number;

test.beforeAll(async ({ request }) => {
  admin = await apiToken(request, ADMIN.email, ADMIN.senha);
  categoriaId = (await apiCriarCategoria(request, admin, `Pedidos ${RUN}`)).id;
});

const novoProduto = (request: APIRequestContext, nome: string, preco = 18.9): Promise<Produto> =>
  apiCriarProduto(request, admin, categoriaId, `${nome} ${RUN}`, preco);

async function adicionarNoCarrinho(page: Page, produto: Produto, vezes = 1) {
  await page.goto('/catalogo');
  const botao = page.getByRole('button', { name: `Adicionar ${produto.descricao} ao carrinho` });
  for (let i = 0; i < vezes; i++) await botao.click();
}

async function entrarComContaNova(page: Page, request: APIRequestContext, prefixo: string) {
  const conta = await apiNovoCliente(request, prefixo);
  await loginUI(page, conta.email, conta.senha);
  await expect(page).toHaveURL(/\/dashboard$/);
  return conta;
}

/** Faz um pedido de retirada pela interface e devolve o id. */
async function fazerPedido(page: Page, produto: Produto, vezes = 1): Promise<number> {
  await adicionarNoCarrinho(page, produto, vezes);
  await page.goto('/checkout');
  await page.getByRole('button', { name: /Fazer pedido/ }).click();
  await expect(page).toHaveURL(/\/pedidos\/\d+$/);
  return Number(page.url().split('/').pop());
}

test.describe('Cardápio e carrinho (sem login)', () => {
  test('catálogo público mostra a loja aberta, marca o esgotado e não deixa adicioná-lo', async ({
    page,
    request,
    obs,
  }) => {
    const normal = await novoProduto(request, 'Pistache Publico');
    const esgotado = await novoProduto(request, 'Esgotado Publico');
    await apiEsgotado(request, admin, esgotado.id, true);

    await page.goto('/catalogo');

    await expect(page.getByTestId('status-loja')).toContainText('Aberto agora');
    await expect(page.getByRole('heading', { name: normal.descricao })).toBeVisible();
    const cardEsgotado = page.getByTestId('produto-card').filter({ hasText: esgotado.descricao });
    await expect(cardEsgotado.getByText('Esgotado').first()).toBeVisible();
    await expect(cardEsgotado.getByRole('button', { name: `${esgotado.descricao} esgotado` })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    expect(obs.httpErrors, 'nenhuma chamada sem login deve falhar').toEqual([]);
  });

  test('detalhe do produto sem login adiciona com quantidade e observação', async ({ page, request }) => {
    const produto = await novoProduto(request, 'Detalhe', 10);

    await page.goto(`/produto/${produto.id}`);
    await expect(page.getByRole('heading', { name: produto.descricao })).toBeVisible();
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click();
    await page.getByLabel('Observação (opcional)').fill('sem calda');
    await page.getByRole('button', { name: /Adicionar · R\$\s20,00/ }).click();

    await expect(page).toHaveURL(/\/catalogo$/);
    await expect(page.getByRole('link', { name: 'Carrinho (2 itens)' })).toBeVisible();
    await page.goto('/carrinho');
    await expect(page.getByLabel(`Observação para ${produto.descricao}`)).toHaveValue('sem calda');
    await expect(page.getByTestId('subtotal-carrinho')).toHaveText('R$ 20,00');
  });

  test('carrinho fica no navegador: sobrevive ao recarregar e muda quantidade', async ({ page, request }) => {
    const produto = await novoProduto(request, 'Persistente', 12);
    await adicionarNoCarrinho(page, produto);

    await page.goto('/carrinho');
    await page.reload();
    await page.getByRole('button', { name: `Aumentar quantidade de ${produto.descricao}` }).click();
    await expect(page.getByTestId('subtotal-carrinho')).toHaveText('R$ 24,00');
    await page.getByRole('button', { name: `Remover ${produto.descricao}` }).click();
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible();
  });

  test('ao abrir, o carrinho avisa preço mudado e produto esgotado e bloqueia até remover', async ({
    page,
    request,
  }) => {
    const caro = await novoProduto(request, 'Mudou Preco', 10);
    const acabou = await novoProduto(request, 'Vai Esgotar', 10);
    await adicionarNoCarrinho(page, caro);
    await adicionarNoCarrinho(page, acabou);

    // Enquanto o cliente navegava, a loja mudou o preço de um e esgotou o outro.
    const put = await request.put(`${API_URL}/produtos/${caro.id}`, {
      headers: { Authorization: `Bearer ${admin}` },
      data: {
        descricao: caro.descricao, quantidade: 10, preco: 11.5, ativo: true, categoriaId,
        imagemUrl: '', precoEmPontos: 190, ganhoDePontos: 19,
      },
    });
    expect(put.ok()).toBeTruthy();
    await apiEsgotado(request, admin, acabou.id, true);

    await page.goto('/carrinho');

    const aviso = page.getByRole('alert').filter({ hasText: 'Seu carrinho mudou' });
    await expect(aviso).toContainText(`${caro.descricao} mudou de preço: de R$ 10,00 para R$ 11,50.`);
    await expect(aviso).toContainText(`${acabou.descricao} esgotou`);
    await expect(page.getByTestId('subtotal-carrinho')).toHaveText('R$ 21,50');
    const continuar = page.getByRole('button', { name: 'Entrar e finalizar' });
    await expect(continuar).toBeDisabled();

    await page.getByRole('button', { name: `Remover ${acabou.descricao}` }).click();
    await expect(continuar).toBeEnabled();
  });

  test('loja fechada mostra "Fechado, abre às HH:MM"; sem Pix configurado aparece fechada', async ({
    page,
  }) => {
    const loja = async (extra: object) => {
      await page.route(`${API_URL}/loja`, async (route) => {
        const res = await route.fetch();
        await route.fulfill({ response: res, json: { ...(await res.json()), ...extra } });
      });
    };
    // Próxima abertura hoje às 23:00 em São Paulo (o teste roda nesse fuso).
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    await loja({ aberta: false, motivoFechada: 'FORA_DO_HORARIO', proximaAbertura: `${hoje}T23:00:00-03:00` });
    await page.goto('/catalogo');
    await expect(page.getByTestId('status-loja')).toContainText('Fechado, abre às 23:00');

    await page.unroute(`${API_URL}/loja`);
    await loja({ aberta: false, motivoFechada: 'PAGAMENTO_NAO_CONFIGURADO', formasPagamento: [] });
    await page.reload();
    await expect(page.getByTestId('status-loja')).toContainText('A loja ainda não está recebendo pedidos pelo app.');
  });
});

test.describe('Checkout', () => {
  test('exige login: cadastro rápido e volta para o checkout com o carrinho', async ({ page, request }) => {
    const produto = await novoProduto(request, 'Checkout Login');
    await adicionarNoCarrinho(page, produto);
    await page.goto('/carrinho');
    await page.getByRole('button', { name: 'Entrar e finalizar' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Entre para finalizar o pedido. Seu carrinho continua salvo.')).toBeVisible();
    await page.getByRole('link', { name: 'Cadastre-se' }).click();
    await page.getByLabel('Nome completo').fill('Cliente Rapido');
    await page.getByLabel('E-mail').fill(`rapido${RUN}@teste.com`);
    await page.getByLabel('Telefone').pressSequentially('11987654321');
    await page.getByLabel('Senha', { exact: true }).fill('Senha123');
    await page.getByLabel('Confirmar senha').fill('Senha123');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole('region', { name: 'Resumo do pedido' })).toContainText(produto.descricao);
  });

  test('retirada: resumo com total e pontos, botão trava e o envio leva a chave de idempotência', async ({
    page,
    request,
  }) => {
    const produto = await novoProduto(request, 'Retirada', 18.9); // 19 pontos por unidade
    await entrarComContaNova(page, request, 'retirada');
    await adicionarNoCarrinho(page, produto, 2);
    await page.goto('/checkout');

    const resumo = page.getByRole('region', { name: 'Resumo do pedido' });
    await expect(page.getByTestId('total-checkout')).toHaveText('R$ 37,80');
    await expect(resumo).toContainText('Você ganha 38 pts quando o pedido for concluído.');
    await expect(page.getByText('Pix', { exact: true })).toBeVisible();

    // Segura a resposta para ver o botão travado e garantir um envio só.
    const envios: string[] = [];
    let liberar!: () => void;
    const travado = new Promise<void>((r) => (liberar = r));
    await page.route(`${API_URL}/pedidos`, async (route) => {
      if (route.request().method() === 'POST') {
        envios.push(route.request().headers()['idempotency-key']);
        await travado;
      }
      await route.continue();
    });
    const botao = page.getByRole('button', { name: /Fazer pedido|Enviando pedido/ });
    await botao.click();
    await expect(botao).toBeDisabled();
    await expect(botao).toHaveText(/Enviando pedido/);
    await botao.click({ force: true }).catch(() => undefined); // toque duplo
    liberar();

    await expect(page).toHaveURL(/\/pedidos\/\d+$/);
    expect(envios).toHaveLength(1);
    expect(envios[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    await expect(page.getByRole('heading', { name: /^Pedido #\d+$/ })).toBeVisible();
    // Pedido criado: o carrinho esvazia.
    await expect(page.getByRole('link', { name: 'Carrinho (0 itens)' })).toBeVisible();
  });

  test('entrega: mínimo aparece antes de finalizar, CEP obrigatório e taxa no total', async ({
    page,
    request,
  }) => {
    const barato = await novoProduto(request, 'Barato Entrega', 6);
    await entrarComContaNova(page, request, 'entrega');
    await adicionarNoCarrinho(page, barato);
    await page.goto('/checkout');

    await page.getByRole('radio', { name: /Entrega/ }).click();
    await expect(page.getByText(/O pedido mínimo para entrega é R\$\s15,00 \(sem a taxa\)\. Faltam R\$\s9,00\./)).toBeVisible();
    await expect(page.getByRole('button', { name: /Fazer pedido/ })).toBeDisabled();

    // Com 3 unidades (R$ 18,00) passa do mínimo.
    await page.goto('/carrinho');
    await page.getByRole('button', { name: `Aumentar quantidade de ${barato.descricao}` }).click();
    await page.getByRole('button', { name: `Aumentar quantidade de ${barato.descricao}` }).click();
    await page.goto('/checkout');
    await page.getByRole('radio', { name: /Entrega/ }).click();
    await expect(page.getByTestId('total-checkout')).toHaveText('R$ 26,00'); // 18 + 8 de taxa
    await expect(page.getByLabel('Cidade da entrega')).toHaveText('Taquaritinga');

    await page.getByRole('button', { name: /Fazer pedido/ }).click();
    await expect(page.getByText('Informe o CEP (8 dígitos).')).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByLabel('CEP').fill('15900000');
    await page.getByLabel('Rua').fill('Rua das Flores');
    await page.getByLabel('Número').fill('123');
    await page.getByLabel('Bairro').fill('Centro');
    await page.getByRole('button', { name: /Fazer pedido/ }).click();

    await expect(page).toHaveURL(/\/pedidos\/\d+$/);
    await expect(page.getByText('Rua das Flores, 123')).toBeVisible();
    await expect(page.getByText('R$ 8,00')).toBeVisible();
  });
});

test.describe('Tela do pedido', () => {
  test('Pix: QR Code, copiar código, contagem regressiva e aviso de confirmação', async ({
    page,
    request,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const produto = await novoProduto(request, 'Pix Tela');
    await entrarComContaNova(page, request, 'pix');
    await fazerPedido(page, produto);

    await expect(page.getByRole('img', { name: 'QR Code do Pix' })).toBeVisible();
    await expect(page.getByTestId('contagem-pix')).toHaveText(/^1[45]:\d\d$/);
    await expect(page.getByText('A loja confirma o pagamento antes de começar o preparo.')).toBeVisible();
    await expect(page.getByTestId('descricao-status')).toHaveText(
      'A loja recebeu seu pedido e vai confirmar em instantes.',
    );

    await page.getByRole('button', { name: 'Copiar código Pix' }).click();
    const codigo = await page.getByLabel('Código Pix copia e cola').inputValue();
    expect(codigo).toMatch(/^000201.*6304[0-9A-F]{4}$/);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(codigo);
  });

  test('polling (15s) mostra o pagamento confirmado e a mudança de status sem recarregar', async ({
    page,
    request,
  }) => {
    await page.clock.install();
    const produto = await novoProduto(request, 'Polling');
    await entrarComContaNova(page, request, 'polling');
    const id = await fazerPedido(page, produto);
    await expect(page.getByTestId('status-pagamento')).toHaveText('Pix · aguardando pagamento');

    await apiPagamento(request, admin, id, 'CONFIRMADO');
    await apiStatus(request, admin, id, 'RECEBIDO', 'ACEITO');
    await page.clock.fastForward('00:16');

    await expect(page.getByTestId('status-pagamento')).toHaveText('Pix · pagamento confirmado');
    await expect(page.getByTestId('descricao-status')).toHaveText('A loja aceitou seu pedido.');
    await expect(page.getByRole('img', { name: 'QR Code do Pix' })).toHaveCount(0);
  });

  test('Pix expirado mostra o aviso e, se a loja confirmar depois, o pedido volta sem recarregar', async ({
    page,
    request,
  }) => {
    await page.clock.install();
    const produto = await novoProduto(request, 'Expirado');
    await entrarComContaNova(page, request, 'expirado');
    const id = await fazerPedido(page, produto);

    // A API cancela o Pix vencido depois de 15 min: simula essa resposta.
    await page.route(`${API_URL}/pedidos/${id}`, async (route) => {
      const res = await route.fetch();
      const pedido = await res.json();
      await route.fulfill({
        response: res,
        json: {
          ...pedido,
          status: 'CANCELADO',
          canceladoPor: 'SISTEMA',
          motivoCancelamento: 'PIX_EXPIRADO',
          pix: null,
          podeCancelar: false,
          historico: [...pedido.historico, { status: 'CANCELADO', em: pedido.data }],
        },
      });
    });
    await page.clock.fastForward('00:16');
    const aviso = 'Pix expirado. Se você já pagou, a loja vai confirmar em breve.';
    await expect(page.getByRole('status').filter({ hasText: aviso })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0);

    // A loja confirma o Pix atrasado: o pedido volta para o fluxo e o polling mostra.
    await page.unroute(`${API_URL}/pedidos/${id}`);
    await apiPagamento(request, admin, id, 'CONFIRMADO');
    await page.clock.fastForward('00:16');

    await expect(page.getByText(aviso)).toHaveCount(0);
    await expect(page.getByTestId('status-pagamento')).toHaveText('Pix · pagamento confirmado');
    await expect(page.getByTestId('descricao-status')).toHaveText(
      'A loja recebeu seu pedido e vai confirmar em instantes.',
    );
  });

  test('cancelar só aparece em RECEBIDO e ACEITO', async ({ page, request }) => {
    await page.clock.install();
    const produto = await novoProduto(request, 'Cancelar');
    await entrarComContaNova(page, request, 'cancelar');
    const id = await fazerPedido(page, produto);
    const cancelar = page.getByRole('button', { name: 'Cancelar pedido' });
    await expect(cancelar).toBeVisible();

    await apiPagamento(request, admin, id, 'CONFIRMADO');
    await apiStatus(request, admin, id, 'RECEBIDO', 'ACEITO');
    await page.clock.fastForward('00:16');
    await expect(page.getByTestId('descricao-status')).toHaveText('A loja aceitou seu pedido.');
    await expect(cancelar).toBeVisible();

    await apiStatus(request, admin, id, 'ACEITO', 'EM_PREPARO');
    await page.clock.fastForward('00:16');
    await expect(page.getByTestId('descricao-status')).toHaveText('Seu pedido está sendo preparado.');
    await expect(cancelar).toHaveCount(0);
  });

  test('cliente cancela o pedido recebido', async ({ page, request }) => {
    const produto = await novoProduto(request, 'Cancela Cliente');
    await entrarComContaNova(page, request, 'cancelacli');
    await fazerPedido(page, produto);

    await page.getByRole('button', { name: 'Cancelar pedido' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar pedido' }).click();

    await expect(page.getByText('Você cancelou este pedido.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0);
  });

  test('pagamento DEVOLVIDO aparece com clareza', async ({ page, request }) => {
    const produto = await novoProduto(request, 'Devolvido');
    await entrarComContaNova(page, request, 'devolvido');
    const id = await fazerPedido(page, produto);
    await apiPagamento(request, admin, id, 'CONFIRMADO');
    await apiStatus(request, admin, id, 'RECEBIDO', 'CANCELADO', 'Acabou o pistache');

    await page.reload();
    await expect(page.getByText('Devolução a caminho')).toBeVisible();
    await expect(page.getByText('Motivo: Acabou o pistache')).toBeVisible();

    await apiPagamento(request, admin, id, 'DEVOLVIDO');
    await page.reload();
    const aviso = page.getByRole('status').filter({ hasText: 'Pagamento devolvido' });
    await expect(aviso).toContainText('A loja devolveu R$ 18,90 para você pelo Pix.');
    await expect(page.getByTestId('status-pagamento')).toHaveText('Pix · pagamento devolvido');
  });

  test('"Falar com a loja no WhatsApp" abre o número da loja com o número do pedido', async ({
    page,
    request,
  }) => {
    const produto = await novoProduto(request, 'Whats');
    await entrarComContaNova(page, request, 'whats');
    const id = await fazerPedido(page, produto);

    const link = page.getByRole('link', { name: 'Falar com a loja no WhatsApp' });
    const href = new URL((await link.getAttribute('href'))!);
    expect(href.origin + href.pathname).toBe('https://wa.me/5516999990000');
    expect(href.searchParams.get('text')).toContain(`pedido #${id}`);
  });
});

test.describe('Meus pedidos e pontos', () => {
  test('meus pedidos lista os pedidos reais da API', async ({ page, request }) => {
    const produto = await novoProduto(request, 'Lista');
    await entrarComContaNova(page, request, 'lista');
    const id = await fazerPedido(page, produto, 2);

    await page.goto('/pedidos');
    const card = page.getByRole('link', { name: new RegExp(`Pedido #${id}`) });
    await expect(card).toContainText('2 itens');
    await expect(card).toContainText('Retirada');
    await expect(card).toContainText('Aguardando pagamento do Pix');
    await expect(card).toContainText('R$ 37,80');
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/pedidos/${id}$`));
  });

  test('saldo zero explica como ganhar; concluir credita e cancelar estorna no extrato', async ({
    page,
    request,
  }) => {
    const produto = await novoProduto(request, 'Pontos'); // 19 pontos
    await entrarComContaNova(page, request, 'pontos');
    await page.goto('/pontos');
    await expect(page.getByText('Você ganha pontos a cada pedido concluído')).toBeVisible();
    await expect(page.getByText('0 pts', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Em breve' })).toHaveCount(1); // resgate

    const id = await fazerPedido(page, produto);
    await apiPagamento(request, admin, id, 'CONFIRMADO');
    for (const [de, para] of [['RECEBIDO', 'ACEITO'], ['ACEITO', 'EM_PREPARO'], ['EM_PREPARO', 'PRONTO'], ['PRONTO', 'CONCLUIDO']]) {
      await apiStatus(request, admin, id, de, para);
    }
    await page.goto('/pontos');
    await expect(page.getByText('19 pts', { exact: true })).toBeVisible();
    const extrato = page.getByRole('list', { name: 'Extrato de pontos' });
    await expect(extrato.getByRole('listitem').filter({ hasText: `Pedido #${id}` })).toContainText('+19');

    await apiStatus(request, admin, id, 'CONCLUIDO', 'CANCELADO', 'Cobrança contestada');
    await page.reload();
    await expect(extrato.getByRole('listitem').filter({ hasText: `Estorno do pedido #${id}` })).toContainText('-19');
    await expect(page.getByText('Você ganha pontos a cada pedido concluído')).toBeVisible();
  });
});

test.describe('Celular (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('catálogo, carrinho, checkout e pedido cabem na tela sem rolagem horizontal', async ({
    page,
    request,
  }) => {
    const produto = await novoProduto(request, 'Celular com nome bem comprido para quebrar linha');
    await entrarComContaNova(page, request, 'celular');
    const semRolagemLateral = async (rota: string) => {
      const largura = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(largura[0], `rolagem horizontal em ${rota}`).toBeLessThanOrEqual(largura[1]);
    };

    await adicionarNoCarrinho(page, produto);
    await semRolagemLateral('/catalogo');
    await page.getByRole('link', { name: /Ver carrinho/ }).click();
    await expect(page.getByTestId('item-carrinho')).toBeVisible();
    await semRolagemLateral('/carrinho');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('radio', { name: /Entrega/ }).click();
    await semRolagemLateral('/checkout');
    await page.getByRole('radio', { name: /Retirar na loja/ }).click();
    await page.getByRole('button', { name: /Fazer pedido/ }).click();
    await expect(page.getByRole('img', { name: 'QR Code do Pix' })).toBeVisible();
    await semRolagemLateral('/pedidos/:id');
  });
});
