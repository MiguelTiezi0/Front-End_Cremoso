import { z } from 'zod';

// Pontos são opcionais no contrato da API: campo vazio vira null (e não 0).
const pontosOpcionais = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : v),
  z.coerce.number().int('Use um número inteiro').gte(0, 'Valor inválido').nullable(),
);

export const produtoSchema = z.object({
  descricao: z.string().min(2, 'Descrição é obrigatória'),
  categoriaId: z.coerce.number({ invalid_type_error: 'Selecione uma categoria' }).min(1, 'Categoria é obrigatória'),
  preco: z.coerce.number().gt(0, 'Preço deve ser maior que 0'),
  quantidade: z.coerce.number().int('Use um número inteiro').gte(0, 'Quantidade não pode ser negativa'),
  precoEmPontos: pontosOpcionais,
  ganhoDePontos: pontosOpcionais,
  imagemUrl: z.string().url('URL inválida').or(z.literal('')),
  ativo: z.boolean(),
});
export type ProdutoForm = z.infer<typeof produtoSchema>;

export const categoriaSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  descricao: z.string().min(2, 'Descrição é obrigatória'),
  imagemUrl: z.string().url('URL inválida').or(z.literal('')),
  ativa: z.boolean(),
});
export type CategoriaForm = z.infer<typeof categoriaSchema>;
