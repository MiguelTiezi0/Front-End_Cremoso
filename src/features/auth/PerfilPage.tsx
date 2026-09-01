import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller } from 'react-hook-form';
import { Save, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { TextInput } from '@/components/ui/FormField';
import { Spinner, RowSkeleton } from '@/components/ui/Loaders';
import { EmptyState, StatusPedidoBadge } from '@/components/ui/Misc';
import { perfilSchema, type PerfilForm } from './validation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { authService } from '@/api/authService';
import { pedidoService } from '@/api/pedidoService';
import type { Pedido } from '@/types';
import { extractErrorMessage, formatBRL, formatData, maskTelefone } from '@/lib/format';

export default function PerfilPage() {
  const { user, isAdmin, updateUser } = useAuth();
  const toast = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PerfilForm>({ resolver: zodResolver(perfilSchema) });

  useEffect(() => {
    if (user) {
      reset({
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        senha: '',
        confirmarSenha: '',
      });
    }
  }, [user, reset]);

  useEffect(() => {
    if (isAdmin) {
      setLoadingPedidos(false);
      return;
    }
    let active = true;
    pedidoService
      .list()
      .then((data) => active && setPedidos(data))
      .finally(() => active && setLoadingPedidos(false));
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const onSubmit = async (data: PerfilForm) => {
    if (!user) return;
    try {
      const updated = await authService.updatePerfil(user.id, {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        senha: data.senha || undefined,
      });
      updateUser(updated);
      reset({ ...data, senha: '', confirmarSenha: '' });
      toast.success('Perfil atualizado com sucesso!');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Meu perfil"
        subtitle={isAdmin ? 'Gerencie seus dados de acesso.' : 'Gerencie seus dados e veja seus pedidos.'}
      />

      <div className={`grid gap-6 ${isAdmin ? '' : 'lg:grid-cols-5'}`}>
        {/* Dados pessoais */}
        <section className={`card ${isAdmin ? 'mx-auto w-full max-w-2xl' : 'lg:col-span-3'}`}>
          <h2 className="mb-4 text-lg font-bold text-slate-800">Dados pessoais</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <TextInput label="Nome completo" error={errors.nome?.message} {...register('nome')} />
            <TextInput
              label="E-mail"
              type="email"
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
                  error={errors.telefone?.message}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(maskTelefone(e.target.value))}
                />
              )}
            />

            <div className="rounded-2xl bg-cream-100 p-4">
              <p className="mb-3 text-sm font-bold text-slate-600">
                Alterar senha{' '}
                <span className="font-normal text-slate-400">(deixe em branco para manter)</span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Nova senha"
                  type="password"
                  autoComplete="new-password"
                  error={errors.senha?.message}
                  {...register('senha')}
                />
                <TextInput
                  label="Confirmar nova senha"
                  type="password"
                  autoComplete="new-password"
                  error={errors.confirmarSenha?.message}
                  {...register('confirmarSenha')}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              Salvar alterações
            </button>
          </form>
        </section>

        {/* Histórico de pedidos (somente cliente) */}
        {!isAdmin && (
          <section className="card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Histórico de pedidos</h2>
              <Link to="/pedidos" className="text-sm font-bold text-blueberry-500 hover:underline">
                Ver todos
              </Link>
            </div>

            {loadingPedidos ? (
              <div className="space-y-2">
                <RowSkeleton cols={3} />
                <RowSkeleton cols={3} />
              </div>
            ) : pedidos.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-8 w-8" />}
                title="Nenhum pedido ainda"
                description="Seus pedidos aparecerão aqui."
              />
            ) : (
              <ul className="divide-y divide-cream-100">
                {pedidos.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/pedidos/${p.id}`}
                      className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-700">Pedido #{p.id}</p>
                        <p className="text-xs text-slate-400">
                          {formatData(p.data)} · {p.itens.length} item(ns)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-700">{formatBRL(p.total)}</p>
                        <StatusPedidoBadge status={p.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
