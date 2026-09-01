import { z } from 'zod';

// Senha forte: mín. 8 caracteres, ao menos 1 letra e 1 número.
const senhaForte = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
  .regex(/[0-9]/, 'Inclua ao menos um número');

export const loginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
  lembrarMe: z.boolean().optional(),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    nome: z.string().min(3, 'Informe seu nome completo'),
    email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
    telefone: z.string().min(14, 'Telefone incompleto'),
    senha: senhaForte,
    confirmarSenha: z.string().min(1, 'Confirme a senha'),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: 'As senhas não conferem',
    path: ['confirmarSenha'],
  });
export type RegisterForm = z.infer<typeof registerSchema>;

export const perfilSchema = z
  .object({
    nome: z.string().min(3, 'Informe seu nome completo'),
    email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
    telefone: z.string().min(14, 'Telefone incompleto'),
    senha: z.string().optional(),
    confirmarSenha: z.string().optional(),
  })
  .refine((d) => !d.senha || d.senha.length >= 8, {
    message: 'A nova senha deve ter no mínimo 8 caracteres',
    path: ['senha'],
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: 'As senhas não conferem',
    path: ['confirmarSenha'],
  });
export type PerfilForm = z.infer<typeof perfilSchema>;

export const enderecoSchema = z.object({
  rua: z.string().min(2, 'Informe a rua'),
  numero: z.string().min(1, 'Nº'),
  complemento: z.string().optional(),
  bairro: z.string().min(2, 'Informe o bairro'),
  cidade: z.string().min(2, 'Informe a cidade'),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  pontoReferencia: z.string().optional(),
  padrao: z.boolean(),
});
export type EnderecoForm = z.infer<typeof enderecoSchema>;
