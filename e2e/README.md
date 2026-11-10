# Testes ponta a ponta (Playwright)

Testam o front pela interface contra a **API real** (`VITE_USE_MOCK=false`). Usam o Chrome
instalado na máquina (`channel: 'chrome'`), então não é preciso baixar navegador.

## Pré-requisitos

1. **Backend** rodando em `http://localhost:8080/api` com `APP_ENV=dev`, para o seed criar
   `admin@cremoso.com / Admin@123` e `cliente@cremoso.com / Senha@123`. Use um banco
   **descartável**: os testes criam categorias, produtos e contas a cada execução.
   O `CORS_ORIGINS` do backend precisa incluir `http://localhost:5173`.
2. **Front** rodando em `http://localhost:5173` com a API real. As variáveis de ambiente
   têm prioridade sobre o `.env`, então não é preciso editá-lo:

   ```bash
   # Git Bash
   VITE_USE_MOCK=false VITE_API_BASE_URL=http://localhost:8080/api npm run dev
   ```
   ```powershell
   # PowerShell
   $env:VITE_USE_MOCK='false'; $env:VITE_API_BASE_URL='http://localhost:8080/api'; npm run dev
   ```

## Rodar

```bash
npx playwright test -c e2e                      # tudo
npx playwright test -c e2e cliente.spec.ts      # um arquivo
npx playwright test -c e2e -g "logout"          # por nome
npx playwright show-report e2e/playwright-report
```

O teste de **token expirado** precisa do segredo do backend para assinar o token. Sem ele,
o teste é pulado:

```bash
E2E_JWT_SECRET="<JWT_SECRET do backend>" npx playwright test -c e2e
```

O teste do **Pix vencido** precisa vencer o Pix sem esperar 15 minutos: ele antecipa
`pix_expira_em` direto no banco descartável do backend, com o Python do backend
(`../Back-end/.venv`). Passe a mesma URL de banco que o backend usa; sem ela, o teste é
pulado:

```bash
E2E_DATABASE_URL="postgresql+psycopg://usuario:senha@localhost:5432/cremoso_e2e" npx playwright test -c e2e
```

Variáveis opcionais: `E2E_BACKEND_DIR` (pasta do backend, se não for `../Back-end`),
`E2E_BASE_URL`, `E2E_API_URL`, `E2E_BROWSER_CHANNEL` (ex.: `msedge`),
`E2E_ADMIN_EMAIL`/`E2E_ADMIN_SENHA` e `E2E_CLIENTE_EMAIL`/`E2E_CLIENTE_SENHA`.

## Arquivos

| Arquivo | O que cobre |
|---|---|
| `fixtures.ts` | Login pela UI, helpers de API e o fixture `obs`, que registra erros de console, exceções JS e respostas HTTP ≥ 400 em `test-results/observacoes.jsonl` |
| `visitante.spec.ts` | Acesso sem login, cadastro (sucesso, 409, 400, validação do front), regras de senha/e-mail/telefone iguais no front e no back, bloco "Contas de teste" em dev, login (sucesso e 401) |
| `cliente.spec.ts` | Dados e saldo, validação da sessão em `/auth/me` (dados atualizados e loader), destaques (lista, vazio, erro), catálogo, pontos nulos nos cards, erros de rede, edição de perfil, bloqueio de admin, logout, token inválido e expirado |
| `admin.spec.ts` | CRUD de categorias e produtos pela UI, 409 ao excluir, filtros, endpoints sem tela, valores quebrados, pontos nulos (`— / —`), placeholder de imagem (tabela e mobile) |
| `pedidos.spec.ts` | Entrega 2 (cliente): cardápio público (aberto/fechado, esgotado), detalhe, carrinho no navegador e revalidação (preço e esgotado), checkout com login/cadastro e volta, retirada e entrega (mínimo, CEP, taxa), idempotência e botão travado, tela do pedido (QR, copiar, contagem, polling, Pix expirado e confirmação tardia, cancelar, devolvido, WhatsApp), meus pedidos, pontos (crédito e estorno) e layout em 390×844 |
| `painel.spec.ts` | Etapa 4: observação por item (corpo do pedido, tela do pedido e painel), checkout com o total da prévia da API; painel da loja: pedido novo em destaque, som e atualização a cada 10 s, tela acesa recusada, botões só do que a API permite (entrega), preparo exige Pix, cancelar com motivo na tela, WhatsApp com mensagem do status, comanda, "Esgotado" de um toque, configurações (validação, Pix de teste, aviso do topo), dashboard e layout em 390×844 |
| `mock-flag.spec.ts` | Regra do mock seguro (`src/config/mockFlag.ts`): desligado sem a variável, só liga com `"true"`, nunca em produção. Não abre navegador |
| `evidencias/` | Prints do relatório `TESTE_FRONT.md` (01–05: antes das correções; 06–07: depois) |

Os testes batem na API real. `page.route` só entra onde a situação não dá para criar
pela API na hora:
- destaques vazios e com erro: simulam a resposta de `/produtos/ativos`;
- pontos: troca só o saldo de `/pontos/saldo` (conta nova tem 0);
- loja fechada (fora do horário e sem Pix): troca campos de `/loja`;
- prévia: troca o total de `/pedidos/previa` para provar que o checkout mostra o da API;
- botão travado: segura a resposta do `POST /pedidos` para conferir que sai um envio só.

O que a loja faz (aceitar, confirmar Pix, preparar, concluir, cancelar, devolver, confirmar
Pix vencido) é feito **pela tela do painel**, numa segunda sessão logada como admin. O Pix
vencido é de verdade: o teste antecipa o vencimento no banco (ver `E2E_DATABASE_URL`).
No painel, o som e o Wake Lock são trocados por versões de mentira (`addInitScript`) para
contar as notas tocadas e simular o navegador recusando a tela acesa; `window.print` também.

Os testes de polling usam `page.clock` para avançar os 15 s (cliente) e 10 s (painel) sem
esperar.

O `pedidos.spec.ts` precisa da loja configurada pelo seed de dev do backend (aberta,
entrega ligada, taxa R$ 8,00, mínimo R$ 15,00, WhatsApp `(16) 99999-0000`).
