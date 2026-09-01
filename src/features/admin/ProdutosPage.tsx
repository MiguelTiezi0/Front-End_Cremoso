import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextInput, SelectInput } from '@/components/ui/FormField';
import { RowSkeleton, Spinner } from '@/components/ui/Loaders';
import { AtivoBadge, EmptyState, ErrorState, Toggle } from '@/components/ui/Misc';
import { produtoSchema, type ProdutoForm } from './validation';
import { categoriaService, produtoService } from '@/api/catalogoService';
import { useToast } from '@/context/ToastContext';
import type { Categoria, Produto, ProdutoInput } from '@/types';
import { extractErrorMessage, formatBRL, formatDataHora } from '@/lib/format';

const emptyForm: ProdutoForm = {
  descricao: '',
  categoriaId: 0,
  preco: 0,
  quantidade: 0,
  precoEmPontos: 0,
  ganhoDePontos: 0,
  imagemUrl: '',
  ativo: true,
};

export default function ProdutosPage() {
  const toast = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<number | 'TODAS'>('TODAS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [toDelete, setToDelete] = useState<Produto | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoForm>({ resolver: zodResolver(produtoSchema), defaultValues: emptyForm });

  const carregar = () => {
    setLoading(true);
    setError(null);
    Promise.all([produtoService.list(), categoriaService.list()])
      .then(([prods, cats]) => {
        setProdutos(prods);
        setCategorias(cats);
      })
      .catch((e) => setError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  const filtrados = useMemo(() => {
    return produtos.filter((p) => {
      if (busca && !p.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroCategoria !== 'TODAS' && p.categoria.id !== filtroCategoria) return false;
      if (filtroStatus === 'ATIVOS' && !p.ativo) return false;
      if (filtroStatus === 'INATIVOS' && p.ativo) return false;
      return true;
    });
  }, [produtos, busca, filtroCategoria, filtroStatus]);

  const abrirNovo = () => {
    if (categorias.length === 0) {
      toast.error('Cadastre uma categoria antes de criar produtos.');
      return;
    }
    setEditing(null);
    reset({ ...emptyForm, categoriaId: categorias[0].id });
    setModalOpen(true);
  };

  const abrirEdicao = (p: Produto) => {
    setEditing(p);
    reset({
      descricao: p.descricao,
      categoriaId: p.categoria.id,
      preco: p.preco,
      quantidade: p.quantidade,
      precoEmPontos: p.precoEmPontos,
      ganhoDePontos: p.ganhoDePontos,
      imagemUrl: p.imagemUrl,
      ativo: p.ativo,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: ProdutoForm) => {
    const payload: ProdutoInput = { ...data };
    try {
      if (editing) {
        await produtoService.update(editing.id, payload);
        toast.success('Produto atualizado!');
      } else {
        await produtoService.create(payload);
        toast.success('Produto criado!');
      }
      setModalOpen(false);
      carregar();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const toggleAtivo = async (p: Produto) => {
    setTogglingId(p.id);
    try {
      const updated = await produtoService.toggleAtivo(p.id);
      setProdutos((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const excluir = async () => {
    if (!toDelete) return;
    try {
      await produtoService.remove(toDelete.id);
      toast.success('Produto removido.');
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
        title="Produtos"
        subtitle="Gerencie o catálogo de produtos."
        action={
          <button className="btn-primary" onClick={abrirNovo}>
            <Plus className="h-4 w-4" /> Novo produto
          </button>
        }
      />

      {/* Filtros */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por descrição…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar produtos"
          />
        </div>
        <select
          className="input"
          value={filtroCategoria}
          onChange={(e) =>
            setFiltroCategoria(e.target.value === 'TODAS' ? 'TODAS' : Number(e.target.value))
          }
          aria-label="Filtrar por categoria"
        >
          <option value="TODAS">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as typeof filtroStatus)}
          aria-label="Filtrar por status"
        >
          <option value="TODOS">Todos os status</option>
          <option value="ATIVOS">Somente ativos</option>
          <option value="INATIVOS">Somente inativos</option>
        </select>
      </div>

      {loading ? (
        <div className="card space-y-2 p-2">
          <RowSkeleton cols={5} />
          <RowSkeleton cols={5} />
          <RowSkeleton cols={5} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={carregar} />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10" />}
          title="Nenhum produto encontrado"
          description="Ajuste os filtros ou cadastre um novo produto."
        />
      ) : (
        <>
          {/* Tabela (desktop) */}
          <div className="hidden overflow-hidden rounded-2xl border border-cream-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-cream-100 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Estoque</th>
                  <th className="px-4 py-3">Pontos</th>
                  <th className="px-4 py-3">Ativo</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-cream-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imagemUrl}
                          alt=""
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-slate-700">{p.descricao}</p>
                          <p className="text-xs text-slate-400">
                            Atualizado {formatDataHora(p.dataAtualizacao)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.categoria.nome}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{formatBRL(p.preco)}</td>
                    <td className="px-4 py-3">
                      <span className={p.quantidade <= 0 ? 'text-strawberry-600' : 'text-slate-600'}>
                        {p.quantidade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.precoEmPontos} / +{p.ganhoDePontos}
                    </td>
                    <td className="px-4 py-3">
                      {togglingId === p.id ? (
                        <Spinner className="h-4 w-4 text-blueberry-600" />
                      ) : (
                        <Toggle
                          checked={p.ativo}
                          onChange={() => toggleAtivo(p)}
                          label={`Ativar ${p.descricao}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-full p-2 text-slate-500 hover:bg-cream-100"
                          onClick={() => abrirEdicao(p)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-full p-2 text-strawberry-500 hover:bg-strawberry-100"
                          onClick={() => setToDelete(p)}
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="grid gap-3 md:hidden">
            {filtrados.map((p) => (
              <div key={p.id} className="card flex gap-3">
                <img src={p.imagemUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-700">{p.descricao}</p>
                    <AtivoBadge ativo={p.ativo} />
                  </div>
                  <p className="text-xs text-slate-400">{p.categoria.nome}</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {formatBRL(p.preco)}{' '}
                    <span className="text-xs font-normal text-slate-400">· estoque {p.quantidade}</span>
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => abrirEdicao(p)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      className="btn-ghost px-3 py-1.5 text-xs"
                      onClick={() => toggleAtivo(p)}
                      disabled={togglingId === p.id}
                    >
                      {p.ativo ? 'Inativar' : 'Ativar'}
                    </button>
                    <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => setToDelete(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de formulário */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar produto' : 'Novo produto'}
        size="lg"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary" form="produto-form" type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="h-4 w-4" />} Salvar
            </button>
          </>
        }
      >
        <form id="produto-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <TextInput label="Descrição" error={errors.descricao?.message} {...register('descricao')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput
              label="Categoria"
              error={errors.categoriaId?.message}
              {...register('categoriaId')}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectInput>
            <TextInput
              label="Preço (R$)"
              type="number"
              step="0.01"
              min="0"
              error={errors.preco?.message}
              {...register('preco')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput
              label="Quantidade"
              type="number"
              min="0"
              error={errors.quantidade?.message}
              {...register('quantidade')}
            />
            <TextInput
              label="Preço em pontos"
              type="number"
              min="0"
              hint="Para resgate"
              error={errors.precoEmPontos?.message}
              {...register('precoEmPontos')}
            />
            <TextInput
              label="Ganho de pontos"
              type="number"
              min="0"
              hint="Na compra"
              error={errors.ganhoDePontos?.message}
              {...register('ganhoDePontos')}
            />
          </div>
          <TextInput
            label="URL da imagem"
            hint="Cole o link de uma imagem (opcional)"
            error={errors.imagemUrl?.message}
            {...register('imagemUrl')}
          />
          <div className="flex items-center justify-between rounded-2xl bg-cream-100 px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">Produto ativo</span>
            <Toggle checked={watch('ativo')} onChange={(v) => setValue('ativo', v)} label="Ativo" />
          </div>

          {editing && (
            <p className="text-xs text-slate-400">
              Cadastrado em {formatDataHora(editing.dataCadastro)} · Última atualização{' '}
              {formatDataHora(editing.dataAtualizacao)} (preenchido pelo back-end).
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Remover produto"
        message={`Tem certeza que deseja remover "${toDelete?.descricao}"? Considere apenas inativá-lo.`}
        confirmLabel="Remover"
        onConfirm={excluir}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
