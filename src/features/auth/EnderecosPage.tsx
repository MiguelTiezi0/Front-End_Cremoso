import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Home, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextInput } from '@/components/ui/FormField';
import { CardSkeleton, Spinner } from '@/components/ui/Loaders';
import { EmptyState, ErrorState } from '@/components/ui/Misc';
import { enderecoSchema, type EnderecoForm } from './validation';
import { enderecoService } from '@/api/enderecoService';
import { useToast } from '@/context/ToastContext';
import type { Endereco } from '@/types';
import { extractErrorMessage, maskCep } from '@/lib/format';

const emptyForm: EnderecoForm = {
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  cep: '',
  pontoReferencia: '',
  padrao: false,
};

export default function EnderecosPage() {
  const toast = useToast();
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Endereco | null>(null);
  const [toDelete, setToDelete] = useState<Endereco | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnderecoForm>({ resolver: zodResolver(enderecoSchema), defaultValues: emptyForm });

  const carregar = () => {
    setLoading(true);
    setError(null);
    enderecoService
      .list()
      .then(setEnderecos)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  const abrirNovo = () => {
    setEditing(null);
    reset(emptyForm);
    setModalOpen(true);
  };

  const abrirEdicao = (e: Endereco) => {
    setEditing(e);
    reset({ ...emptyForm, ...e });
    setModalOpen(true);
  };

  const onSubmit = async (data: EnderecoForm) => {
    try {
      if (editing) {
        await enderecoService.update(editing.id, data);
        toast.success('Endereço atualizado!');
      } else {
        await enderecoService.create(data);
        toast.success('Endereço adicionado!');
      }
      setModalOpen(false);
      carregar();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const definirPadrao = async (e: Endereco) => {
    try {
      const updated = await enderecoService.setPadrao(e.id);
      setEnderecos(updated);
      toast.success('Endereço padrão atualizado.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const excluir = async () => {
    if (!toDelete) return;
    try {
      await enderecoService.remove(toDelete.id);
      toast.success('Endereço removido.');
      setToDelete(null);
      carregar();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Endereços de entrega"
        subtitle="Gerencie onde você quer receber seus sorvetes."
        action={
          <button className="btn-primary" onClick={abrirNovo}>
            <Plus className="h-4 w-4" /> Novo endereço
          </button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={carregar} />
      ) : enderecos.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-10 w-10" />}
          title="Nenhum endereço cadastrado"
          description="Adicione um endereço para agilizar seus pedidos."
          action={
            <button className="btn-primary" onClick={abrirNovo}>
              <Plus className="h-4 w-4" /> Adicionar endereço
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {enderecos.map((e) => (
            <div key={e.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blueberry-50 text-blueberry-600">
                  <Home className="h-5 w-5" />
                </span>
                {e.padrao && (
                  <span className="badge bg-mint-100 text-mint-600">
                    <Star className="h-3 w-3" /> Padrão
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-600">
                <p className="font-bold text-slate-800">
                  {e.rua}, {e.numero}
                  {e.complemento ? ` — ${e.complemento}` : ''}
                </p>
                <p>
                  {e.bairro} · {e.cidade}
                </p>
                <p>CEP {e.cep}</p>
                {e.pontoReferencia && (
                  <p className="mt-1 text-xs text-slate-400">Ref.: {e.pontoReferencia}</p>
                )}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {!e.padrao && (
                  <button
                    className="btn-ghost px-3 py-1.5 text-xs"
                    onClick={() => definirPadrao(e)}
                  >
                    <Star className="h-3.5 w-3.5" /> Tornar padrão
                  </button>
                )}
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => abrirEdicao(e)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button
                  className="btn-danger px-3 py-1.5 text-xs"
                  onClick={() => setToDelete(e)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar endereço' : 'Novo endereço'}
        size="lg"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn-primary"
              form="endereco-form"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && <Spinner className="h-4 w-4" />} Salvar
            </button>
          </>
        }
      >
        <form id="endereco-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <TextInput label="Rua" error={errors.rua?.message} {...register('rua')} />
            </div>
            <TextInput label="Número" error={errors.numero?.message} {...register('numero')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Complemento"
              hint="Opcional"
              error={errors.complemento?.message}
              {...register('complemento')}
            />
            <TextInput label="Bairro" error={errors.bairro?.message} {...register('bairro')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Cidade" error={errors.cidade?.message} {...register('cidade')} />
            <Controller
              control={control}
              name="cep"
              render={({ field }) => (
                <TextInput
                  label="CEP"
                  inputMode="numeric"
                  placeholder="00000-000"
                  error={errors.cep?.message}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(maskCep(e.target.value))}
                />
              )}
            />
          </div>
          <TextInput
            label="Ponto de referência"
            hint="Opcional"
            error={errors.pontoReferencia?.message}
            {...register('pontoReferencia')}
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blueberry-600 focus:ring-blueberry-300"
              {...register('padrao')}
            />
            Definir como endereço padrão
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remover endereço"
        message={`Tem certeza que deseja remover "${toDelete?.rua}, ${toDelete?.numero}"?`}
        confirmLabel="Remover"
        onConfirm={excluir}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
