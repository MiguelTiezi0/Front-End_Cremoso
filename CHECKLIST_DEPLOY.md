# Checklist de deploy (Entrega 2)

Junta o que está em `Back-end/README.md` (Render, variáveis, CLI, loja) e em `README.md` deste
repositório (Vercel). Marque cada item. Nada aqui foi executado: é o roteiro.

## 0. Antes

- [ ] `entrega-2-pedidos` revisada e mesclada na branch de produção dos dois repositórios
      (o passo a passo do Render no README do backend cita a branch `migracao-python`: use a
      branch que de fato vai para produção).
- [ ] Suítes verdes no commit que vai subir (ver `TESTE_ENTREGA2.md`).
- [ ] Textos de `/privacidade` e `/regras-pontos` revisados (item 6). **Não publique com
      "[REVISAR ANTES DE PUBLICAR]" na tela.**

## 1. Banco (Render → Postgres)

- [ ] Postgres criado na **mesma região** do serviço web.
- [ ] Senha do banco **nova**, gerada pelo Render. Não reaproveite a senha do banco local nem a
      de outro ambiente. Se o banco já existia e a senha passou por algum lugar inseguro, gere
      outra (*Rotate*) e atualize o `DATABASE_URL`.
- [ ] Copiada a **Internal Database URL** (para o serviço) e guardada a **External** só para o
      passo da CLI.

## 2. Backend (Render → Web Service, Docker)

- [ ] Runtime **Docker** (usa o `Dockerfile`), **Health Check Path** `/api/health`, *Docker
      Command* e *Pre-Deploy Command* vazios (a imagem roda as migrations antes de subir).
- [ ] Variáveis:

  | Variável | Valor |
  |---|---|
  | `DATABASE_URL` | Internal Database URL |
  | `JWT_SECRET` | **novo**, 32+ caracteres (*Generate* do Render ou `python -c "import secrets; print(secrets.token_urlsafe(48))"`). Nunca o do `.env` local |
  | `APP_ENV` | `prod` |
  | `CORS_ORIGINS` | URL de produção do front, ex.: `https://seu-app.vercel.app` (sem `/` no fim) |
  | `CORS_ORIGIN_REGEX` | opcional, prévias da Vercel: `https://seu-app-[a-z0-9-]+\.vercel\.app` |
  | `JWT_EXPIRATION_SECONDS` | opcional (padrão 86400) |

- [ ] **Não** definir `SEED_*` nem `PORT` em produção.
- [ ] Log do deploy mostra as migrations até a **0005**: `0001 schema inicial`, `0002 lojas`,
      `0003 pedidos e pontos`, `0004 observação por item`, `0005 aceite dos termos`; depois o
      uvicorn no ar. Se a migration falhar, o servidor não sobe.
- [ ] `https://<servico>.onrender.com/api/health` → `{"status":"ok"}`.

## 3. Front (Vercel)

- [ ] `VITE_API_BASE_URL=https://<servico>.onrender.com/api` em **Production** (e Preview, se
      usar). Sem ela o site publicado procura a API em `localhost`.
- [ ] `VITE_USE_MOCK` **não** definida.
- [ ] Depois de mudar variável, **Redeploy** (elas entram no build).
- [ ] O site abre o cardápio sem erro de CORS no console (se der, confira `CORS_ORIGINS`).

## 4. Primeiro admin (CLI)

- [ ] Pelo *Shell* do Render: `python -m app.cli criar-admin`
      **ou** da sua máquina, com a External Database URL:
      `DATABASE_URL="<External URL>" JWT_SECRET="qualquer-valor-com-32+-caracteres" python -m app.cli criar-admin`.
- [ ] A senha é pedida sem eco: senha forte e guardada num lugar seguro.
- [ ] Login com esse admin no site abre o painel.

## 5. Configurar a loja e testar o Pix

- [ ] Menu **Loja**: nome, cidade, WhatsApp, chave Pix, nome e cidade do recebedor, entrega,
      taxa, mínimo e horários (ver `GUIA_LOJA.md`).
- [ ] Some o aviso "A loja ainda não recebe pedidos: configure o Pix".
- [ ] **Pix de teste de R$ 0,01** pago e conferido no extrato: caiu na conta certa, com o nome
      certo. Faça em **mais de um banco** (o leitor de QR de cada banco é um pouco diferente).

## 6. Textos legais

- [ ] Em `src/features/legal/` preencher **[NOME DA LOJA]**, **[CNPJ]**,
      **[E-MAIL DE CONTATO]**, **[VALIDADE DOS PONTOS]** e o trecho "[REVISAR: …]" das regras.
- [ ] Revisão por quem responde pela loja (de preferência com orientação jurídica).
- [ ] Tirar o aviso "[REVISAR ANTES DE PUBLICAR]" (`src/features/legal/PaginaLegal.tsx`).
- [ ] Se o texto mudar **depois** que houver clientes cadastrados, mudar a versão nos dois
      lugares: `Front-end/src/config/termos.ts` e `Back-end/app/models/cliente.py`
      (`VERSAO_TERMOS`). Hoje a versão só é exigida no cadastro: quem já tem conta não é
      chamado a aceitar de novo.

## 7. Teste em aparelho real (antes de anunciar)

Use o celular ou tablet que vai ficar no balcão e um celular de cliente.

- [ ] **Som:** painel aberto em **Pedidos**, "Ativar som", volume alto. Faça um pedido pelo
      celular de cliente e confira que toca em até ~10 s. Repita com a tela do balcão parada por
      alguns minutos.
- [ ] **Tela acesa:** a mensagem "Tela sempre acesa" aparece (exige https, que a Vercel já
      tem). Deixe 10 min sem tocar: a tela não pode apagar. Se o navegador recusar, ajuste o
      tempo de tela do aparelho.
- [ ] **Impressão:** "Imprimir comanda" na impressora real (térmica de 58/80 mm ou comum):
      número, itens, observações, total, Pix e endereço legíveis.
- [ ] **Pix de verdade, pedido completo:** pedido de retirada de valor pequeno, pagar pelo QR
      Code e pelo "copia e cola", conferir no extrato, confirmar no painel, preparar, pronto,
      WhatsApp (abre o número certo com a mensagem), concluir. No celular do cliente: cada etapa
      aparece sozinha e os pontos entram uma vez.
- [ ] **Entrega:** pedido com CEP, taxa e mínimo; endereço certo na comanda.
- [ ] **Cancelar e devolver:** cancelar um pedido pago, devolver o Pix pelo banco e "Marcar como
      DEVOLVIDO"; o cliente vê "Pagamento devolvido".
- [ ] **Pix vencido:** deixar um pedido sem pagar por 15 min; ele cancela sozinho; pagar e
      confirmar pela seção "Pix vencido — ainda dá pra confirmar".
- [ ] **Esgotado e horário:** marcar um produto esgotado e ver no celular do cliente; mudar o
      horário e ver "Fechado, abre às …".
- [ ] **Queda de internet:** desligar o Wi-Fi do balcão por 1 min e religar: o painel avisa e
      volta sozinho (ou com "Tentar agora").

## 8. Depois de subir

- [ ] Plano gratuito do Render "dorme": a primeira abertura do dia pode levar ~1 min. Abra o
      painel antes do horário de abertura.
- [ ] Conferir os pontos de vez em quando (ver "Conferir os pontos" no README do backend).
