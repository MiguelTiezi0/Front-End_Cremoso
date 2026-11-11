import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Bike, CheckCircle2, QrCode, Send, Store } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/Misc';
import { CardSkeleton, Spinner } from '@/components/ui/Loaders';
import { LojaStatus } from '@/components/LojaStatus';
import { AvisosCarrinho } from '@/components/AvisosCarrinho';
import { pedidoService } from '@/api/pedidoService';
import { useAuth } from '@/context/AuthContext';
import { useCarrinho } from '@/context/CarrinhoContext';
import { useToast } from '@/context/ToastContext';
import { useLoja } from '@/hooks/useLoja';
import { useRevalidarCarrinho } from '@/hooks/useRevalidarCarrinho';
import { usePrevia } from '@/hooks/usePrevia';
import type { EnderecoEntregaInput, TipoEntrega } from '@/types';
import { MAX_OBSERVACAO_PEDIDO, corpoDaPrevia, corpoDoPedido, novaChave } from '@/lib/carrinho';
import { extractErrorMessage, formatBRL, formatPontos, maskCep, statusHttp } from '@/lib/format';

type CampoEndereco = keyof EnderecoEntregaInput;

const ENDERECO_VAZIO: EnderecoEntregaInput = {
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  referencia: '',
};

function validarEndereco(e: EnderecoEntregaInput): Partial<Record<CampoEndereco, string>> {
  const erros: Partial<Record<CampoEndereco, string>> = {};
  if (e.cep.replace(/\D/g, '').length !== 8) erros.cep = 'Informe o CEP (8 dígitos).';
  if (!e.rua.trim()) erros.rua = 'Informe a rua.';
  if (!e.numero.trim()) erros.numero = 'Informe o número.';
  if (!e.bairro.trim()) erros.bairro = 'Informe o bairro.';
  return erros;
}

const codigoDoErro = (err: unknown): string | undefined =>
  (err as { response?: { data?: { codigo?: string } } })?.response?.data?.codigo;

// Checkout (exige login). Total, taxa, pontos e mínimo vêm da prévia da API
// (POST /pedidos/previa), refeita a cada mudança. Na criação a API recalcula tudo de novo e,
// se o total mudou no meio do caminho, responde 409 TOTAL_DIVERGENTE (aí a tela confere o
// carrinho e refaz a prévia).
export default function CheckoutPage() {
  const { user } = useAuth();
  const carrinho = useCarrinho();
  const toast = useToast();
  const navigate = useNavigate();
  const { loja, erro: erroLoja, carregando: carregandoLoja, recarregar: recarregarLoja } = useLoja();
  const { avisos, bloqueado, conferindo, conferir } = useRevalidarCarrinho();

  const [tipo, setTipo] = useState<TipoEntrega>('RETIRADA');
  const [endereco, setEndereco] = useState<EnderecoEntregaInput>(ENDERECO_VAZIO);
  const [errosEndereco, setErrosEndereco] = useState<Partial<Record<CampoEndereco, string>>>({});
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [criado, setCriado] = useState(false);
  // Mesma chave enquanto o conteúdo do pedido for o mesmo: reenviar depois de uma falha de
  // rede devolve o pedido já criado em vez de duplicar. Conteúdo novo, chave nova.
  const chave = useRef<{ valor: string; corpo: string } | null>(null);
  // Item recusado pela prévia (esgotou, saiu, mudou de preço): confere o carrinho, que
  // atualiza o preço e mostra o aviso; a prévia é refeita com o carrinho novo.
  const { previa, erro: erroPrevia, calculando, recalcular } = usePrevia(
    carrinho.itens.length > 0 ? corpoDaPrevia(carrinho.itens, tipo, endereco.cep) : null,
    () => void conferir(),
  );

  if (carrinho.itens.length === 0 && !criado) return <Navigate to="/carrinho" replace />;

  if (carregandoLoja) {
    return (
      <div className="mx-auto max-w-3xl">
        <CardSkeleton />
      </div>
    );
  }
  if (!loja) {
    return <ErrorState message={erroLoja ?? 'Não foi possível carregar a loja.'} onRetry={recarregarLoja} />;
  }

  const entrega = tipo === 'ENTREGA';
  const minimo = loja.pedidoMinimo ?? 0;
  const faltaMinimo = previa && entrega && !previa.atingeMinimo ? previa.faltaParaMinimo : 0;
  const semPix = !loja.formasPagamento.includes('PIX');
  const podeEnviar =
    loja.aberta && !semPix && !bloqueado && !conferindo && !!previa && previa.podeFinalizar;

  const mudarEndereco = (campo: CampoEndereco, valor: string) => {
    setEndereco((e) => ({ ...e, [campo]: campo === 'cep' ? maskCep(valor) : valor }));
    setErrosEndereco((e) => ({ ...e, [campo]: undefined }));
  };

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (enviando || !podeEnviar) return;
    if (entrega) {
      const erros = validarEndereco(endereco);
      setErrosEndereco(erros);
      if (Object.keys(erros).length > 0) return;
    }

    const corpo = corpoDoPedido(carrinho.itens, {
      tipoEntrega: tipo,
      endereco: entrega
        ? {
            ...endereco,
            complemento: endereco.complemento?.trim() || undefined,
            referencia: endereco.referencia?.trim() || undefined,
          }
        : undefined,
      observacaoGeral: observacao,
      totalExibido: previa?.total,
    });
    const json = JSON.stringify(corpo);
    if (chave.current?.corpo !== json) chave.current = { valor: novaChave(), corpo: json };

    setEnviando(true);
    setErroEnvio(null);
    try {
      const pedido = await pedidoService.criar(corpo, chave.current.valor);
      setCriado(true);
      chave.current = null;
      carrinho.limpar();
      toast.success(`Pedido #${pedido.id} enviado!`);
      navigate(`/pedidos/${pedido.id}`, { replace: true });
    } catch (err) {
      const codigo = codigoDoErro(err);
      setErroEnvio(
        statusHttp(err) === undefined
          ? 'Sem conexão com a loja. Tente de novo: se o pedido já tiver sido criado, ele não será duplicado.'
          : extractErrorMessage(err, 'Não foi possível enviar o pedido.'),
      );
      if (codigo === 'TOTAL_DIVERGENTE' || codigo === 'PRODUTO_INDISPONIVEL') {
        void conferir();
        recalcular();
      }
      if (codigo === 'LOJA_FECHADA' || codigo === 'PAGAMENTO_INDISPONIVEL' || codigo === 'ENTREGA_INDISPONIVEL') {
        recarregarLoja();
      }
      if (codigo === 'IDEMPOTENCIA_CONFLITO') chave.current = null;
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="mx-auto max-w-3xl space-y-5 pb-36 md:pb-0" noValidate>
      <PageHeader title="Finalizar pedido" />

      <LojaStatus loja={loja} compacto />
      <AvisosCarrinho avisos={avisos} />

      {/* Retirada ou entrega */}
      <fieldset className="card space-y-3 p-4 sm:p-6">
        <legend className="sr-only">Como você quer receber</legend>
        <h2 className="font-bold text-slate-800">Como você quer receber?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <OpcaoEntrega
            ativa={tipo === 'RETIRADA'}
            onClick={() => setTipo('RETIRADA')}
            icone={<Store className="h-5 w-5" />}
            titulo="Retirar na loja"
            detalhe="Sem taxa"
          />
          {loja.entregaAtiva ? (
            <OpcaoEntrega
              ativa={entrega}
              onClick={() => setTipo('ENTREGA')}
              icone={<Bike className="h-5 w-5" />}
              titulo="Entrega"
              detalhe={`Taxa ${formatBRL(loja.taxaEntrega)} · só em ${loja.cidade}${
                minimo > 0 ? ` · mínimo ${formatBRL(minimo)}` : ''
              }`}
            />
          ) : (
            <p className="rounded-xl bg-cream-100 px-4 py-3 text-xs text-slate-500">
              A loja não está fazendo entregas agora. Só retirada.
            </p>
          )}
        </div>

        {entrega && faltaMinimo > 0 && (
          <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            O pedido mínimo para entrega é {formatBRL(previa?.pedidoMinimo ?? minimo)} (sem a taxa). Faltam{' '}
            {formatBRL(faltaMinimo)}.{' '}
            <Link to="/catalogo" className="underline">
              Adicionar itens
            </Link>
          </p>
        )}

        {entrega && (
          <div className="grid gap-3 sm:grid-cols-6">
            <Campo
              id="cep" label="CEP" className="sm:col-span-2" inputMode="numeric" autoComplete="postal-code"
              placeholder="00000-000" valor={endereco.cep} erro={errosEndereco.cep}
              onChange={(v) => mudarEndereco('cep', v)}
            />
            <Campo
              id="rua" label="Rua" className="sm:col-span-4" autoComplete="address-line1" maxLength={150}
              valor={endereco.rua} erro={errosEndereco.rua} onChange={(v) => mudarEndereco('rua', v)}
            />
            <Campo
              id="numero" label="Número" className="sm:col-span-2" maxLength={20}
              valor={endereco.numero} erro={errosEndereco.numero} onChange={(v) => mudarEndereco('numero', v)}
            />
            <Campo
              id="complemento" label="Complemento (opcional)" className="sm:col-span-4" maxLength={100}
              valor={endereco.complemento ?? ''} onChange={(v) => mudarEndereco('complemento', v)}
            />
            <Campo
              id="bairro" label="Bairro" className="sm:col-span-3" maxLength={100}
              valor={endereco.bairro} erro={errosEndereco.bairro} onChange={(v) => mudarEndereco('bairro', v)}
            />
            <div className="sm:col-span-3">
              <span className="label">Cidade</span>
              <p className="input bg-cream-100 text-slate-500" aria-label="Cidade da entrega">
                {loja.cidade}
              </p>
            </div>
            <Campo
              id="referencia" label="Ponto de referência (opcional)" className="sm:col-span-6" maxLength={150}
              valor={endereco.referencia ?? ''} onChange={(v) => mudarEndereco('referencia', v)}
            />
          </div>
        )}
      </fieldset>

      {/* Pagamento */}
      <section className="card space-y-2 p-4 sm:p-6">
        <h2 className="font-bold text-slate-800">Pagamento</h2>
        <div className="flex items-center gap-3 rounded-xl bg-blueberry-50 px-4 py-3 ring-2 ring-blueberry-300">
          <QrCode className="h-5 w-5 text-blueberry-600" />
          <div>
            <p className="text-sm font-bold text-slate-800">Pix</p>
            <p className="text-xs text-slate-500">
              Na próxima tela você recebe o QR Code e o código copia e cola. A loja confirma o
              pagamento antes de começar o preparo.
            </p>
          </div>
        </div>
      </section>

      {/* Observação */}
      <section className="card p-4 sm:p-6">
        <label htmlFor="observacao" className="mb-2 block font-bold text-slate-800">
          Observação para a loja (opcional)
        </label>
        <textarea
          id="observacao"
          className="input min-h-20"
          maxLength={MAX_OBSERVACAO_PEDIDO}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: tocar o interfone"
        />
      </section>

      {/* Resumo */}
      <section className="card p-4 sm:p-6" aria-label="Resumo do pedido">
        <h2 className="mb-3 font-bold text-slate-800">Resumo</h2>
        <ul className="space-y-1 text-sm">
          {carrinho.itens.map((i) => {
            const calculado = previa?.itens.find((p) => p.produtoId === i.produtoId);
            return (
              <li key={i.produtoId} className="flex justify-between gap-3">
                <span className="min-w-0 text-slate-600">
                  {i.quantidade}× {i.descricao}
                  {i.observacao.trim() && (
                    <span className="block text-xs italic text-slate-400">Obs.: {i.observacao.trim()}</span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-slate-700">
                  {calculado ? formatBRL(calculado.subtotal) : '…'}
                </span>
              </li>
            );
          })}
        </ul>
        {/* Valores calculados pela API (prévia); a criação recalcula e confere de novo. */}
        <dl className="mt-3 space-y-1 border-t border-cream-200 pt-3 text-sm" aria-busy={calculando}>
          <Linha label="Subtotal" valor={previa ? formatBRL(previa.subtotal) : '…'} />
          <Linha
            label="Taxa de entrega"
            valor={!entrega ? 'Retirada (grátis)' : previa ? formatBRL(previa.frete) : '…'}
          />
          <div className="flex justify-between pt-1 text-base font-bold text-slate-800">
            <dt>Total</dt>
            <dd data-testid="total-checkout">{previa ? formatBRL(previa.total) : 'Calculando…'}</dd>
          </div>
        </dl>
        {previa && (
          <p className="mt-2 text-xs font-bold text-strawberry-600">
            {previa.pontos > 0
              ? `Você ganha ${formatPontos(previa.pontos)} quando o pedido for concluído.`
              : 'Este pedido não rende pontos.'}
          </p>
        )}
        {erroPrevia && (
          <p role="alert" className="mt-3 text-sm font-semibold text-strawberry-700">
            {erroPrevia}{' '}
            <button type="button" className="underline" onClick={recalcular}>
              Tentar de novo
            </button>
          </p>
        )}
        {user && (
          <p className="mt-2 text-xs text-slate-400">
            A loja fala com você pelo telefone {user.telefone}.{' '}
            <Link to="/perfil" className="underline">
              Alterar
            </Link>
          </p>
        )}
      </section>

      {erroEnvio && (
        <div role="alert" className="rounded-2xl border border-strawberry-200 bg-strawberry-100/60 px-4 py-3 text-sm font-semibold text-strawberry-700">
          {erroEnvio}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-200 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto max-w-3xl">
          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={!podeEnviar || enviando}>
            {enviando ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {enviando
              ? 'Enviando pedido…'
              : previa
                ? `Fazer pedido · ${formatBRL(previa.total)}`
                : 'Fazer pedido'}
          </button>
          {!loja.aberta && (
            <p className="mt-1 text-center text-xs text-slate-500">A loja está fechada agora.</p>
          )}
          <p className="mt-1 text-center text-xs text-slate-400">
            Veja a{' '}
            <Link to="/privacidade" target="_blank" className="underline">
              política de privacidade
            </Link>{' '}
            e as{' '}
            <Link to="/regras-pontos" target="_blank" className="underline">
              regras dos pontos
            </Link>
            .
          </p>
        </div>
      </div>
    </form>
  );
}

function OpcaoEntrega({
  ativa,
  onClick,
  icone,
  titulo,
  detalhe,
}: {
  ativa: boolean;
  onClick: () => void;
  icone: React.ReactNode;
  titulo: string;
  detalhe: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left ring-2 transition-colors ${
        ativa ? 'bg-blueberry-50 ring-blueberry-400' : 'bg-white ring-cream-200 hover:ring-blueberry-200'
      }`}
    >
      <span className="text-blueberry-600">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800">{titulo}</span>
        <span className="block text-xs text-slate-500">{detalhe}</span>
      </span>
      {ativa && <CheckCircle2 className="h-5 w-5 text-blueberry-500" />}
    </button>
  );
}

function Campo({
  id,
  label,
  valor,
  erro,
  onChange,
  className = '',
  ...rest
}: {
  id: string;
  label: string;
  valor: string;
  erro?: string;
  onChange: (v: string) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        className={`input ${erro ? 'input-error' : ''}`}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${id}-erro` : undefined}
        {...rest}
      />
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-xs font-semibold text-strawberry-600">
          {erro}
        </p>
      )}
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between text-slate-500">
      <dt>{label}</dt>
      <dd className="font-semibold text-slate-700">{valor}</dd>
    </div>
  );
}
