import { z } from 'zod';

// Regras iguais às do backend (Back-end/app/services/cliente_service.py) — mude nos dois lugares.

// Senha forte: mín. 8 caracteres, ao menos 1 letra e 1 número.
const senhaForte = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .regex(/\p{L}/u, 'Inclua ao menos uma letra')
  .regex(/[0-9]/, 'Inclua ao menos um número');

// E-mail no formato padrão (o back usa EmailStr); aceita domínios longos (.online, .store).
const email = z.string().min(1, 'Informe o e-mail').email('E-mail inválido');

// Celular com DDD: 11 dígitos, o terceiro é 9; com ou sem máscara. O back normaliza
// para "(11) 91234-5678" antes de salvar.
export const celularValido = (v: string): boolean =>
  /^[\d\s()-]+$/.test(v.trim()) && /^[1-9]{2}9\d{8}$/.test(v.replace(/\D/g, ''));

const telefone = z
  .string()
  .min(1, 'Informe o telefone')
  .refine(celularValido, 'Informe um celular com DDD, ex.: (11) 91234-5678');

export const loginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail').email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
  lembrarMe: z.boolean().optional(),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    nome: z.string().min(3, 'Informe seu nome completo'),
    email,
    telefone,
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
    email,
    telefone,
    senha: z.string().optional(),
    confirmarSenha: z.string().optional(),
  })
  // Senha nova é opcional, mas se preenchida segue as mesmas regras do cadastro.
  .superRefine((d, ctx) => {
    if (!d.senha) return;
    const resultado = senhaForte.safeParse(d.senha);
    if (!resultado.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: resultado.error.issues[0].message, path: ['senha'] });
    }
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
