import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextInput } from '@/components/ui/FormField';
import { CardSkeleton, Spinner } from '@/components/ui/Loaders';
import { AtivoBadge, EmptyState, ErrorState, Toggle } from '@/components/ui/Misc';
import { categoriaSchema, type CategoriaForm } from './validation';
import { categoriaService } from '@/api/catalogoService';
import { useToast } from '@/context/ToastContext';
import type { Categoria } from '@/types';
import { extractErrorMessage } from '@/lib/format';

const emptyForm: CategoriaForm = { nome: '', descricao: '', imagemUrl: '', ativa: true };

export default function CategoriasPage() {
  const toast = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [toDelete, setToDelete] = useState<Categoria | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoriaForm>({ resolver: zodResolver(categoriaSchema), defaultValues: emptyForm });

  const carregar = () => {
    setLoading(true);
    setError(null);
    categoriaService
      .list()
      .then(setCategorias)
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  const abrirNovo = () => {
    setEditing(null);
    reset(emptyForm);
    setModalOpen(true);
  };
  const abrirEdicao = (c: Categoria) => {
    setEditing(c);
    reset(c);
    setModalOpen(true);
  };

  const onSubmit = async (data: CategoriaForm) => {
    try {
      if (editing) {
        await categoriaService.update(editing.id, data);
        toast.success('Categoria atualizada!');
      } else {
        await categoriaService.create(data);
        toast.success('Categoria criada!');
      }
      setModalOpen(false);
      carregar();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const excluir = async () => {
    if (!toDelete) return;
    try {
      await categoriaService.remove(toDelete.id);
      toast.success('Categoria removida.');
      setToDelete(null);
      carregar();
    } catch (err) {
      toast.error(extractErrorMessage(err));
      setToDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Categorias"
        subtitle="Organize os produtos em categorias."
        action={
          <button className="btn-primary" onClick={abrirNovo}>
            <Plus className="h-4 w-4" /> Nova categoria
          </button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={carregar} />
      ) : categorias.length === 0 ? (
        <EmptyState
          icon={<Tags className="h-10 w-10" />}
          title="Nenhuma categoria"
          description="Crie a primeira categoria de produtos."
          action={
            <button className="btn-primary" onClick={abrirNovo}>
              <Plus className="h-4 w-4" /> Nova categoria
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categorias.map((c) => (
            <div key={c.id} className="card flex flex-col gap-3 p-0">
              <div className="h-28 overflow-hidden rounded-t-2xl bg-cream-100">
                {c.imagemUrl && (
                  <img src={c.imagemUrl} alt={c.nome} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4 pt-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">{c.nome}</h3>
                  <AtivoBadge ativo={c.ativa} />
                </div>
                <p className="text-sm text-slate-500">{c.descricao}</p>
                <div className="mt-auto flex gap-2 pt-2">
                  <button className="btn-ghost flex-1 px-3 py-1.5 text-xs" onClick={() => abrirEdicao(c)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => setToDelete(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" form="categoria-form" type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="h-4 w-4" />} Salvar
            </button>
          </>
        }
      >
        <form id="categoria-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput label="Nome" error={errors.nome?.message} {...register('nome')} />
          <TextInput label="Descrição" error={errors.descricao?.message} {...register('descricao')} />
          <TextInput
            label="URL da imagem"
            hint="Cole o link de uma imagem (opcional)"
            error={errors.imagemUrl?.message}
            {...register('imagemUrl')}
          />
          <div className="flex items-center justify-between rounded-2xl bg-cream-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">Categoria ativa</span>
            <Toggle checked={watch('ativa')} onChange={(v) => setValue('ativa', v)} label="Ativa" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remover categoria"
        message={`Remover a categoria "${toDelete?.nome}"? Categorias com produtos não podem ser removidas.`}
        confirmLabel="Remover"
        onConfirm={excluir}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
