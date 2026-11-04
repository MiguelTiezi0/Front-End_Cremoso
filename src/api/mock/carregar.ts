// Carrega o mock sob demanda. Os services usam `if (MOCK.x) return (await mock()).algo()`
// em vez de importar o mockApi direto: em produção as flags são `false` literais, o ramo
// é removido e este import() some do bundle — junto com o mock, que grava dados no
// localStorage ao ser importado e traz as contas de exemplo.
export const mock = () => import('./mockApi').then((m) => m.mockApi);
