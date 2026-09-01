import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { loginSchema, type LoginForm } from './validation';
import { TextInput } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Loaders';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { extractErrorMessage } from '@/lib/format';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { lembrarMe: true },
  });

  const onSubmit = async (data: LoginForm) => {
    setApiError(null);
    try {
      const user = await login(data);
      toast.success(`Bem-vindo(a), ${user.nome.split(' ')[0]}!`);
      navigate(from, { replace: true });
    } catch (err) {
      setApiError(extractErrorMessage(err, 'Não foi possível entrar. Verifique suas credenciais.'));
    }
  };

  return (
    <AuthLayout title="Entrar" subtitle="Que bom te ver de novo! Acesse sua conta.">
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
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="relative">
          <TextInput
            label="Senha"
            type={showPass ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
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

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-blueberry-600 focus:ring-blueberry-300"
            {...register('lembrarMe')}
          />
          Manter-me conectado
        </label>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          Entrar
        </button>

        <p className="text-center text-sm text-slate-500">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-bold text-blueberry-600 hover:underline">
            Cadastre-se
          </Link>
        </p>

        <div className="rounded-2xl bg-cream-100 px-4 py-3 text-xs text-slate-500">
          <p className="font-bold text-slate-600">Contas de teste (mock):</p>
          <p>Cliente — cliente@cremoso.com / Senha@123</p>
          <p>Admin — admin@cremoso.com / Admin@123</p>
        </div>
      </form>
    </AuthLayout>
  );
}
