import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { registerSchema, type RegisterForm } from './validation';
import { TextInput } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Loaders';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { extractErrorMessage, maskTelefone } from '@/lib/format';

// Indicador simples de força da senha.
function forcaSenha(senha: string): { label: string; pct: number; color: string } {
  let score = 0;
  if (senha.length >= 8) score++;
  if (/[A-Z]/.test(senha)) score++;
  if (/[0-9]/.test(senha)) score++;
  if (/[^A-Za-z0-9]/.test(senha)) score++;
  const map = [
    { label: 'Muito fraca', pct: 20, color: 'bg-strawberry-500' },
    { label: 'Fraca', pct: 40, color: 'bg-strawberry-400' },
    { label: 'Média', pct: 60, color: 'bg-amber-400' },
    { label: 'Boa', pct: 80, color: 'bg-mint-500' },
    { label: 'Forte', pct: 100, color: 'bg-mint-600' },
  ];
  return map[score];
}

export default function CadastroPage() {
  const { register: registerUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const senha = watch('senha') ?? '';
  const forca = forcaSenha(senha);

  const onSubmit = async (data: RegisterForm) => {
    setApiError(null);
    try {
      const user = await registerUser({
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        senha: data.senha,
      });
      toast.success(`Conta criada com sucesso! Bem-vindo(a), ${user.nome.split(' ')[0]}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(extractErrorMessage(err, 'Não foi possível concluir o cadastro.'));
    }
  };

  return (
    <AuthLayout title="Criar conta" subtitle="Cadastre-se e ganhe pontos a cada pedido.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {apiError && (
          <div
            role="alert"
            className="rounded-xl border border-strawberry-200 bg-strawberry-100/60 px-4 py-3 text-sm font-semibold text-strawberry-700"
          >
            {apiError}
          </div>
        )}

        <TextInput
          label="Nome completo"
          autoComplete="name"
          placeholder="Seu nome"
          error={errors.nome?.message}
          {...register('nome')}
        />
        <TextInput
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Controller
          control={control}
          name="telefone"
          render={({ field }) => (
            <TextInput
              label="Telefone"
              inputMode="tel"
              placeholder="(11) 99999-9999"
              error={errors.telefone?.message}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(maskTelefone(e.target.value))}
            />
          )}
        />

        <div>
          <div className="relative">
            <TextInput
              label="Senha"
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              error={errors.senha?.message}
              {...register('senha')}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {senha && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
                <div
                  className={`h-full rounded-full transition-all ${forca.color}`}
                  style={{ width: `${forca.pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">Força: {forca.label}</p>
            </div>
          )}
        </div>

        <TextInput
          label="Confirmar senha"
          type={showPass ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Repita a senha"
          error={errors.confirmarSenha?.message}
          {...register('confirmarSenha')}
        />

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          Criar conta
        </button>

        <p className="text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-bold text-blueberry-600 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
