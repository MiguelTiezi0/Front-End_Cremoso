// Validação da chave Pix igual à da API (Back-end/app/services/pix.py, normalizar_chave):
// CPF, CNPJ, e-mail, celular com +55 ou chave aleatória. Mude nos dois lugares.

export const LIMITE_NOME_PIX = 25;
export const LIMITE_CIDADE_PIX = 15;
const LIMITE_CHAVE = 77;

export const MSG_CHAVE_PIX_INVALIDA =
  'Chave Pix inválida. Use CPF, CNPJ, e-mail, celular no formato +55DDDNÚMERO ou a chave aleatória.';

function cpfValido(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(d[tamanho])) return false;
  }
  return true;
}

function cnpjValido(d: string): boolean {
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  for (const tamanho of [12, 13]) {
    const pesos = [
      ...Array.from({ length: tamanho - 8 }, (_, i) => tamanho - 7 - i),
      ...[9, 8, 7, 6, 5, 4, 3, 2],
    ];
    const resto = pesos.reduce((s, p, i) => s + Number(d[i]) * p, 0) % 11;
    if ((resto < 2 ? 0 : 11 - resto) !== Number(d[tamanho])) return false;
  }
  return true;
}

export function chavePixValida(valor: string): boolean {
  const chave = valor.trim();
  if (!chave) return false;
  if (chave.includes('@')) {
    return chave.length <= LIMITE_CHAVE && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(chave);
  }
  if (chave.startsWith('+')) return /^\+55[1-9]{2}9?\d{8}$/.test(chave.replace(/[\s()-]/g, ''));
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(chave.toLowerCase())) {
    return true;
  }
  const digitos = chave.replace(/[.\-/\s]/g, '');
  return /^\d+$/.test(digitos) && (cpfValido(digitos) || cnpjValido(digitos));
}

// Como o nome e a cidade vão no Pix: sem acento, maiúsculas, só letras, números e espaço.
export function textoPix(texto: string, limite: number): string {
  return texto
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limite)
    .trim();
}
