import type { APIRequestContext, Page } from '@playwright/test';
import {
  ADMIN,
  API_URL,
  RUN,
  abaDoPainel,
  abrirPainel,
  apiCriarCategoria,
  apiCriarPedido,
  apiCriarProduto,
  apiNovoCliente,
  apiToken,
  botaoNoPainel,
  cardDoPedido,
  confirmarPixNoPainel,
  expect,
  loginUI,
  test,
  toast,
} from './fixtures';

// Etapa 4: observação por item, prévia do pedido (parte A) e painel da loja (parte B),
// contra a API real com o seed de dev do backend. Os pedidos de teste são criados pela API
// (é o lado do cliente); tudo que a loja faz é feito pela tela do painel.

interface Produto {
  id: number;
  descricao: string;
  preco: number;
}

let admin: string;
let categoriaId: number;

test.beforeAll(async ({ request }) => {
  admin = await apiToken(request, ADMIN.email, ADMIN.senha);
  categoriaId = (await apiCriarCategoria(request, admin, `Painel ${RUN}`)).id;
});

const novoProduto = (request: APIRequestContext, nome: string, preco = 18.9): Promise<Produto> =>
  apiCriarProduto(request, admin, categoriaId, `${nome} ${RUN}`, preco);

/** Conta nova de cliente com um pedido criado pela API. */
async function pedidoDeCliente(
  request: APIRequestContext,
  produto: Produto,
  opcoes: { observacao?: string; extra?: Record<string, unknown>; quantidade?: number } = {},
) {
  const conta = await apiNovoCliente(request, 'painel');
  const token = await apiToken(request, conta.email, conta.senha);
  return apiCriarPedido(
    request,
    token,
    [{ produtoId: produto.id, quantidade: opcoes.quantidade ?? 1, observacao: opcoes.observacao }],
    opcoes.extra,
  ) as Promise<{ id: number; total: number }>;
}

// Áudio e tela acesa de mentira, para o teste contar as notas tocadas sem alto-falante.
async function somETelaDeMentira(page: Page, telaRecusa = false) {
  await page.addInitScript((recusa) => {
    const w = window as unknown as Record<string, unknown>;
    w.__notas = 0;
    class AudioDeMentira {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      onstatechange: (() => void) | null = null;
      async resume() {
        this.state = 'running';
        this.onstatechange?.();
      }
      async suspend() {
        this.state = 'suspended';
      }
      async close() {}
      createOscillator() {
        w.__notas = (w.__notas as number) + 1;
        return { type: '', frequency: { value: 0 }, connect: (x: unknown) => x, start() {}, stop() {} };
      }
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect: (x: unknown) => x,
        };
      }
    }
    w.AudioContext = AudioDeMentira;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          if (recusa) throw new DOMException('Bateria fraca', 'NotAllowedError');
          return { released: false, release: async () => undefined, addEventListener() {} };
        },
      },
    });
  }, telaRecusa);
}

const notas = (page: Page) => page.evaluate(() => (window as unknown as { __notas: number }).__notas);

test.describe('Parte A: observação por item e prévia', () => {
  test('cada item leva a própria observação, separada da geral, até o pedido e o painel', async ({
    page,
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const pistache = await novoProduto(request, 'Obs Pistache');
    const morango = await novoProduto(request, 'Obs Morango', 12.5);
    const conta = await apiNovoCliente(request, 'obsitem');
    await loginUI(page, conta.email, conta.senha);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/catalogo');
    for (const p of [pistache, morango]) {
      await page.getByRole('button', { name: `Adicionar ${p.descricao} ao carrinho` }).click();
    }
    await page.goto('/carrinho');
    await page.getByLabel(`Observação para ${pistache.descricao}`).fill('sem calda');
    await page.goto('/checkout');
    await page.getByLabel('Observação para a loja (opcional)').fill('Capricha!');
    const resumo = page.getByRole('region', { name: 'Resumo do pedido' });
    await expect(resumo).toContainText('Obs.: sem calda');

    const envio = page.waitForRequest((r) => r.url() === `${API_URL}/pedidos` && r.method() === 'POST');
    await page.getByRole('button', { name: /Fazer pedido/ }).click();
    const corpo = (await envio).postDataJSON();
    expect(corpo.itens).toEqual([
      { produtoId: pistache.id, quantidade: 1, observacao: 'sem calda' },
      { produtoId: morango.id, quantidade: 1 },
    ]);
    expect(corpo.observacao).toBe('Capricha!');

    await expect(page).toHaveURL(/\/pedidos\/\d+$/);
    const id = Number(page.url().split('/').pop());
    await expect(page.getByText('Obs.: sem calda')).toBeVisible();
    await expect(page.getByText('Capricha!')).toBeVisible();

    const painel = await abrirPainel(browser, testInfo);
    const card = cardDoPedido(painel, id);
    await expect(card.getByRole('listitem').filter({ hasText: pistache.descricao })).toContainText('Obs.: sem calda');
    await expect(card.getByRole('listitem').filter({ hasText: morango.descricao })).not.toContainText('Obs.');
    await expect(card).toContainText('Observação: Capricha!');
  });

  test('o checkout mostra o total, a taxa e os pontos calculados pela prévia da API', async ({ page, request }) => {
    const produto = await novoProduto(request, 'Previa', 10);
    const conta = await apiNovoCliente(request, 'previa');
    await loginUI(page, conta.email, conta.senha);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/catalogo');
    const botao = page.getByRole('button', { name: `Adicionar ${produto.descricao} ao carrinho` });
    await botao.click();
    await botao.click();

    // A API calcula; a tela só mostra. Para provar, a resposta da prévia é alterada.
    const pedidos: unknown[] = [];
    await page.route(`${API_URL}/pedidos/previa`, async (route) => {
      pedidos.push(route.request().postDataJSON());
      const res = await route.fetch();
      const previa = await res.json();
      await route.fulfill({ response: res, json: { ...previa, total: 99.99, pontos: 7 } });
    });
    await page.goto('/checkout');

    await expect(page.getByTestId('total-checkout')).toHaveText('R$ 99,99');
    await expect(page.getByRole('button', { name: /Fazer pedido · R\$\s99,99/ })).toBeVisible();
    await expect(page.getByText('Você ganha 7 pts quando o pedido for concluído.')).toBeVisible();
    expect(pedidos[0]).toEqual({
      tipoEntrega: 'RETIRADA',
      itens: [{ produtoId: produto.id, quantidade: 2, precoExibido: 10 }],
    });

    // Entrega: a prévia é refeita com a taxa (sem precisar do CEP).
    await page.unroute(`${API_URL}/pedidos/previa`);
    await page.getByRole('radio', { name: /Entrega/ }).click();
    await expect(page.getByTestId('total-checkout')).toHaveText('R$ 28,00'); // 20 + 8 de taxa
  });
});

test.describe('Painel da loja', () => {
  test('pedido novo aparece em destaque com hora e espera, toca o som e a fila atualiza a cada 10 s', async ({
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Som');
    const painel = await abrirPainel(browser, testInfo, '/admin/pedidos', {
      preparar: async (p) => {
        await somETelaDeMentira(p);
        await p.clock.install();
      },
    });

    // Sem o toque, o som está desligado e o aviso fica na tela.
    const aviso = painel.getByRole('alert').filter({ hasText: 'Som desligado' });
    await expect(aviso).toBeVisible();
    await painel.getByRole('button', { name: 'Ativar som' }).click();
    await expect(aviso).toHaveCount(0);
    await expect(painel.getByText('Som ligado para pedidos novos.')).toBeVisible();
    await expect(painel.getByTestId('estado-tela')).toContainText('Tela sempre acesa');
    expect(await notas(painel)).toBe(3); // o toque de teste ao ativar

    const pedido = await pedidoDeCliente(request, produto);
    await expect(cardDoPedido(painel, pedido.id)).toHaveCount(0);
    await painel.clock.fastForward('00:11');

    const card = cardDoPedido(painel, pedido.id);
    await expect(card).toBeVisible();
    await expect(card.getByText('NOVO')).toBeVisible();
    await expect(card).toContainText(/\d\d:\d\d/);
    await expect(card.getByTestId('espera')).toHaveText(/agora|há \d+ min/);
    await expect(painel.getByRole('tab', { name: /^Novos/ })).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => notas(painel)).toBe(6);

    // O mesmo pedido não toca de novo.
    await painel.clock.fastForward('00:11');
    await expect(card).toBeVisible();
    expect(await notas(painel)).toBe(6);
  });

  test('sem tela acesa (navegador recusou) o painel avisa e continua funcionando', async ({
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Sem Tela');
    const painel = await abrirPainel(browser, testInfo, '/admin/pedidos', {
      preparar: (p) => somETelaDeMentira(p, true),
    });
    await expect(painel.getByTestId('estado-tela')).toContainText('não deixou manter a tela acesa');

    const pedido = await pedidoDeCliente(request, produto);
    await painel.getByRole('button', { name: 'Atualizar' }).click();
    await expect(cardDoPedido(painel, pedido.id)).toBeVisible();
  });

  test('entrega: só os botões que a API permite, e o preparo exige o Pix confirmado', async ({
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Entrega Painel');
    const pedido = await pedidoDeCliente(request, produto, {
      extra: {
        tipoEntrega: 'ENTREGA',
        endereco: { cep: '15900000', rua: 'Rua das Flores', numero: '123', bairro: 'Centro', referencia: 'Praça' },
      },
    });
    const painel = await abrirPainel(browser, testInfo);
    const card = cardDoPedido(painel, pedido.id);
    const botoes = async () => (await card.getByRole('button').allTextContents()).map((t) => t.trim());

    await expect(card).toContainText('Rua das Flores, 123 · Centro · CEP 15900-000 · Ref.: Praça');
    expect(await botoes()).toEqual([
      'Aceitar pedido',
      'Confirmar pagamento',
      'Cancelar pedido',
      'Imprimir comanda',
    ]);

    await botaoNoPainel(painel, pedido.id, 'Aceitar pedido');
    await abaDoPainel(painel, 'Aceitos');
    await expect(card.getByRole('button', { name: 'Começar preparo' })).toBeDisabled();
    await expect(card.getByText('O preparo só começa com o Pix confirmado.')).toBeVisible();
    await expect(card.getByText('Confira no extrato do banco antes de confirmar.')).toBeVisible();

    await confirmarPixNoPainel(painel, pedido.id);
    await botaoNoPainel(painel, pedido.id, 'Começar preparo');
    await abaDoPainel(painel, 'Em preparo');
    await expect(card.getByRole('button', { name: 'Pronto para retirada' })).toHaveCount(0);
    await botaoNoPainel(painel, pedido.id, 'Saiu para entrega');
    await abaDoPainel(painel, 'Prontos');
    await botaoNoPainel(painel, pedido.id, 'Concluir (entregue)');
    await abaDoPainel(painel, 'Concluídos');
    expect(await botoes()).toEqual(['Cancelar (estorna os pontos)', 'Imprimir comanda']);
    await expect(card.getByTestId('espera')).toHaveCount(0); // concluído não conta espera
  });

  test('cancelar pede o motivo na própria tela, sem janela do navegador', async ({
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Cancela Painel');
    const pedido = await pedidoDeCliente(request, produto);
    const painel = await abrirPainel(browser, testInfo);
    const janelas: string[] = [];
    painel.on('dialog', (d) => {
      janelas.push(d.type());
      void d.dismiss();
    });

    const card = cardDoPedido(painel, pedido.id);
    await card.getByRole('button', { name: 'Cancelar pedido' }).click();
    const grupo = card.getByRole('group', { name: 'Cancelar pedido' });
    const confirmar = grupo.getByRole('button', { name: 'Confirmar cancelamento' });
    await expect(confirmar).toBeDisabled(); // sem motivo não cancela
    await grupo.getByRole('button', { name: 'Voltar' }).click();
    await expect(grupo).toHaveCount(0);
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Cancelar pedido' }).click();
    await grupo.getByRole('button', { name: 'Produto acabou' }).click();
    await confirmar.click();
    await expect(toast(painel, `Pedido #${pedido.id} cancelado.`)).toBeVisible();
    await expect(card).toHaveCount(0);
    expect(janelas).toEqual([]);

    const res = await request.get(`${API_URL}/admin/pedidos/${pedido.id}`, {
      headers: { Authorization: `Bearer ${admin}` },
    });
    const salvo = await res.json();
    expect([salvo.status, salvo.canceladoPor, salvo.motivoCancelamento]).toEqual(['CANCELADO', 'LOJA', 'Produto acabou']);
  });

  test('WhatsApp do cliente com a mensagem do status e comanda para imprimir', async ({
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Comanda');
    const pedido = await pedidoDeCliente(request, produto, {
      observacao: 'sem calda',
      extra: { observacao: 'Capricha!' },
    });
    const painel = await abrirPainel(browser, testInfo, '/admin/pedidos', {
      preparar: (p) =>
        p.addInitScript(() => {
          const w = window as unknown as { __impressoes: number; print: () => void };
          w.__impressoes = 0;
          w.print = () => {
            w.__impressoes += 1;
          };
        }),
    });
    const card = cardDoPedido(painel, pedido.id);
    const whatsapp = async () => {
      const href = new URL((await card.getByRole('link', { name: 'Avisar cliente no WhatsApp' }).getAttribute('href'))!);
      expect(href.origin + href.pathname).toBe('https://wa.me/5511987654321');
      return href.searchParams.get('text') ?? '';
    };
    expect(await whatsapp()).toContain(`Recebemos seu pedido #${pedido.id}.`);

    // Comanda
    await card.getByRole('button', { name: 'Imprimir comanda' }).click();
    expect(await painel.evaluate(() => (window as unknown as { __impressoes: number }).__impressoes)).toBe(1);
    const comanda = painel.getByTestId('comanda');
    const texto = ((await comanda.textContent()) ?? '').replace(/\s+/g, ' ');
    for (const trecho of [
      `PEDIDO #${pedido.id}`,
      'Cliente: Cliente painel',
      'Telefone: (11) 98765-4321',
      `1x ${produto.descricao}`,
      '>> sem calda',
      'OBS: Capricha!',
      'TOTAL: R$ 18,90',
      'Pagamento: Pix · Pix aguardando',
      'RETIRADA NO BALCÃO',
    ]) {
      expect(texto, trecho).toContain(trecho);
    }
    await expect(painel.locator('body')).toHaveClass(/imprimindo/);

    // Pronto para retirada: a mensagem acompanha o status.
    await confirmarPixNoPainel(painel, pedido.id);
    await botaoNoPainel(painel, pedido.id, 'Aceitar pedido');
    await abaDoPainel(painel, 'Aceitos');
    await botaoNoPainel(painel, pedido.id, 'Começar preparo');
    await abaDoPainel(painel, 'Em preparo');
    await botaoNoPainel(painel, pedido.id, 'Pronto para retirada');
    await abaDoPainel(painel, 'Prontos');
    expect(await whatsapp()).toContain(`Seu pedido #${pedido.id} está pronto para retirada.`);
  });

  test('produtos: "Esgotado" com um toque, separado do ativo', async ({ request, browser }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Acabou Hoje');
    const painel = await abrirPainel(browser, testInfo, '/admin/produtos');
    const botao = painel.getByRole('button', { name: `Esgotado: ${produto.descricao}` });

    await expect(botao).toHaveAttribute('aria-pressed', 'false');
    await botao.click();
    await expect(botao).toHaveAttribute('aria-pressed', 'true');
    await expect(toast(painel, `${produto.descricao}: esgotado.`)).toBeVisible();

    const doCardapio = async () => {
      const { categorias } = await (await request.get(`${API_URL}/cardapio`)).json();
      return categorias.flatMap((c: { produtos: { id: number }[] }) => c.produtos).find((p: { id: number }) => p.id === produto.id);
    };
    expect((await doCardapio()).esgotado).toBe(true); // continua no cardápio (ativo), marcado
    await botao.click();
    await expect(botao).toHaveAttribute('aria-pressed', 'false');
    expect((await doCardapio()).esgotado).toBe(false);
  });

  test('configurações: valida chave Pix e celular, mostra o Pix de teste e o aviso do topo some', async ({
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const headers = { Authorization: `Bearer ${admin}` };
    const original = await (await request.get(`${API_URL}/admin/loja`, { headers })).json();
    const { pausada: _p, pixExemplo: _e, ...configOriginal } = original;
    try {
      // Sem Pix a loja não recebe pedidos: o painel avisa no topo.
      const semPix = { ...configOriginal, pixChave: null, pixNomeRecebedor: null, pixCidade: null };
      expect((await request.put(`${API_URL}/admin/loja`, { headers, data: semPix })).ok()).toBeTruthy();

      const painel = await abrirPainel(browser, testInfo, '/dashboard');
      const topo = painel.getByRole('alert').filter({ hasText: 'A loja ainda não recebe pedidos: configure o Pix.' });
      await expect(topo).toBeVisible();
      await topo.getByRole('link', { name: 'Configurar agora' }).click();
      await expect(painel).toHaveURL(/\/admin\/loja$/);

      await painel.getByLabel('Chave Pix').fill('123');
      await painel.getByLabel('Nome de quem recebe').fill('Cremoso Sorvetes');
      await painel.getByLabel('Cidade de quem recebe').fill('Taquaritinga');
      await painel.getByLabel('WhatsApp da loja').fill('1234');
      await painel.getByRole('button', { name: 'Salvar configurações' }).click();
      await expect(painel.getByText(/^Chave Pix inválida/)).toBeVisible();
      await expect(painel.getByText('Informe um celular com DDD, ex.: (16) 99999-0000.')).toBeVisible();

      await painel.getByLabel('Chave Pix').fill('+5516999990000');
      await painel.getByLabel('WhatsApp da loja').fill('16999990000');
      await painel.getByRole('button', { name: 'Salvar configurações' }).click();

      const teste = painel.getByRole('region', { name: 'Pix de teste' });
      await expect(teste).toContainText('Pague com o celular da loja e confira se caiu na conta certa.');
      await expect(teste.getByRole('img', { name: 'QR Code do Pix' })).toBeVisible();
      const codigo = await teste.getByLabel('Código do Pix de teste').inputValue();
      expect(codigo).toMatch(/^000201.*5802BR5916CREMOSO SORVETES6012TAQUARITINGA.*6304[0-9A-F]{4}$/);
      expect(codigo).toContain('54040.01'); // R$ 0,01
      await expect(topo).toHaveCount(0);
    } finally {
      await request.put(`${API_URL}/admin/loja`, { headers, data: configOriginal });
    }
  });

  test('dashboard: pedidos de hoje, faturamento só com Pix confirmado e pedidos aguardando ação', async ({
    request,
    browser,
  }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Dashboard', 23.45);
    const pedido = await pedidoDeCliente(request, produto);
    const headers = { Authorization: `Bearer ${admin}` };
    const resumo = async () => (await request.get(`${API_URL}/admin/pedidos/resumo`, { headers })).json();
    const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const antes = await resumo();
    const painel = await abrirPainel(browser, testInfo, '/dashboard');
    await expect(painel.getByTestId('valor-Pedidos de hoje')).toHaveText(String(antes.pedidos));
    await expect(painel.getByTestId('valor-Faturamento do dia')).toHaveText(brl(antes.totalConfirmado));
    const acao = painel.getByRole('link', { name: 'Aguardando ação' });
    await expect(acao).toContainText(/\d+ novos?/);

    // Confirmar o Pix soma o pedido ao faturamento.
    await painel.goto('/admin/pedidos');
    await confirmarPixNoPainel(painel, pedido.id);
    await painel.goto('/dashboard');
    await expect(painel.getByTestId('valor-Faturamento do dia')).toHaveText(
      brl(Math.round((antes.totalConfirmado + 23.45) * 100) / 100),
    );
  });

  test('no celular (390×844) o painel cabe sem rolagem horizontal', async ({ request, browser }, testInfo) => {
    test.slow();
    const produto = await novoProduto(request, 'Celular Painel');
    await pedidoDeCliente(request, produto, { observacao: 'uma observação bem comprida para testar a quebra' });
    const painel = await abrirPainel(browser, testInfo, '/admin/pedidos', {
      viewport: { width: 390, height: 844 },
    });
    for (const rota of ['/admin/pedidos', '/admin/loja', '/admin/produtos', '/dashboard']) {
      await painel.goto(rota);
      await painel.waitForLoadState('networkidle');
      const sobra = await painel.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(sobra, rota).toBeLessThanOrEqual(0);
    }
  });
});
