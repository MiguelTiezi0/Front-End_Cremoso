import { z } from 'zod';

export const produtoSchema = z.object({
  descricao: z.string().min(2, 'Descrição é obrigatória'),
  categoriaId: z.coerce.number({ invalid_type_error: 'Selecione uma categoria' }).min(1, 'Categoria é obrigatória'),
  preco: z.coerce.number().gt(0, 'Preço deve ser maior que 0'),
  quantidade: z.coerce.number().int('Use um número inteiro').gte(0, 'Quantidade não pode ser negativa'),
  precoEmPontos: z.coerce.number().int().gte(0, 'Valor inválido'),
  ganhoDePontos: z.coerce.number().int().gte(0, 'Valor inválido'),
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
