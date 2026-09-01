// Armazenamento do token JWT.
//
// Estratégia: se a API suportar cookie httpOnly, o token NÃO precisa ser guardado
// aqui (o navegador o envia automaticamente) — nesse caso basta remover o uso deste
// módulo. Enquanto isso, usamos localStorage (sessão persistente, "lembrar-me") ou
// sessionStorage (sessão apenas da aba atual).

const TOKEN_KEY = 'cremoso.token';
const REFRESH_KEY = 'cremoso.refreshToken';
const PERSIST_KEY = 'cremoso.persist';

function store(persist: boolean): Storage {
  return persist ? localStorage : sessionStorage;
}

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  },

  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY);
  },

  set(token: string, refreshToken?: string, persist = true): void {
    // limpa ambos antes de gravar no destino escolhido
    tokenStorage.clear();
    localStorage.setItem(PERSIST_KEY, String(persist));
    store(persist).setItem(TOKEN_KEY, token);
    if (refreshToken) store(persist).setItem(REFRESH_KEY, refreshToken);
  },

  clear(): void {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(TOKEN_KEY);
      s.removeItem(REFRESH_KEY);
    });
    localStorage.removeItem(PERSIST_KEY);
  },
};
