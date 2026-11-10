import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Plus, QrCode, Save, Trash2 } from 'lucide-react';
import type { HorarioLoja, LojaConfig, LojaConfigInput } from '@/types';
import { adminLojaService } from '@/api/adminService';
import { PageHeader } from '@/components/ui/PageHeader';
import { CardSkeleton, Spinner } from '@/components/ui/Loaders';
import { ErrorState, Toggle } from '@/components/ui/Misc';
import { QrCodePix } from '@/components/QrCodePix';
import { useToast } from '@/context/ToastContext';
import { celularValido } from '@/features/auth/validation';
import { copiar } from '@/lib/copiar';
import { extractErrorMessage, maskTelefone } from '@/lib/format';
import { EVENTO_LOJA_SALVA } from '@/lib/loja';
import {
  LIMITE_CIDADE_PIX,
  LIMITE_NOME_PIX,
  MSG_CHAVE_PIX_INVALIDA,
  chavePixValida,
  textoPix,
} from '@/lib/pix';

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

interface Form {
  nome: string;
  cidade: string;
  pixChave: string;
  pixNomeRecebedor: string;
  pixCidade: string;
  whatsapp: string;
  entregaAtiva: boolean;
  taxaEntrega: string;
  pedidoMinimo: string;
  horarios: HorarioLoja[];
}

type Erros = Partial<Record<keyof Form, string>>;

const dinheiroTexto = (v: number | null) => (v === null ? '' : v.toFixed(2).replace('.', ','));
const paraNumero = (v: string): number | null => {
  const limpo = v.trim().replace(/\./g, '').replace(',', '.');
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

const doConfig = (c: LojaConfig): Form => ({
  nome: c.nome,
  cidade: c.cidade ?? '',
  pixChave: c.pixChave ?? '',
  pixNomeRecebedor: c.pixNomeRecebedor ?? '',
  pixCidade: c.pixCidade ?? '',
  whatsapp: c.whatsapp ?? '',
  entregaAtiva: c.entregaAtiva,
  taxaEntrega: dinheiroTexto(c.taxaEntrega),
  pedidoMinimo: dinheiroTexto(c.pedidoMinimo),
  horarios: c.horarios.map((h) => ({ ...h, abre: h.abre.slice(0, 5), fecha: h.fecha.slice(0, 5) })),
});

// Mesmas regras da API (Back-end/app/services/loja_service.py e horario.py).
function validar(f: Form): Erros {
  const e: Erros = {};
  if (!f.nome.trim()) e.nome = 'Informe o nome da loja.';
  if (!f.cidade.trim()) e.cidade = 'Informe a cidade (a entrega só atende esta cidade).';
  const pix = [f.pixChave, f.pixNomeRecebedor, f.pixCidade].map((v) => v.trim() !== '');
  if (pix.some(Boolean)) {
    if (!f.pixChave.trim()) e.pixChave = 'Informe a chave Pix.';
    else if (!chavePixValida(f.pixChave)) e.pixChave = MSG_CHAVE_PIX_INVALIDA;
    if (!textoPix(f.pixNomeRecebedor, LIMITE_NOME_PIX)) e.pixNomeRecebedor = 'Informe o nome de quem recebe.';
    if (!textoPix(f.pixCidade, LIMITE_CIDADE_PIX)) e.pixCidade = 'Informe a cidade do Pix.';
  }
  if (f.whatsapp.trim() && !celularValido(f.whatsapp)) {
    e.whatsapp = 'Informe um celular com DDD, ex.: (16) 99999-0000.';
  }
  const taxa = paraNumero(f.taxaEntrega);
  if (taxa === null || Number.isNaN(taxa) || taxa < 0) e.taxaEntrega = 'Informe a taxa (0 para grátis).';
  const minimo = paraNumero(f.pedidoMinimo);
  if (minimo !== null && (Number.isNaN(minimo) || minimo < 0)) e.pedidoMinimo = 'Valor inválido.';
  for (let dia = 0; dia < 7; dia++) {
    const doDia = f.horarios.filter((h) => h.diaSemana === dia).sort((a, b) => a.abre.localeCompare(b.abre));
    if (doDia.some((h) => !h.abre || !h.fecha || h.fecha <= h.abre)) {
      e.horarios = `${DIAS[dia]}: o fechamento deve ser depois da abertura (sem passar da meia-noite).`;
      break;
    }
    if (doDia.some((h, i) => i > 0 && h.abre < doDia[i - 1].fecha)) {
      e.horarios = `${DIAS[dia]}: os horários se sobrepõem.`;
      break;
    }
  }
  return e;
}

function paraEnvio(f: Form): LojaConfigInput {
  const pix = f.pixChave.trim() !== '';
  return {
    nome: f.nome.trim(),
    cidade: f.cidade.trim(),
    pixChave: pix ? f.pixChave.trim() : null,
    pixNomeRecebedor: pix ? f.pixNomeRecebedor.trim() : null,
    pixCidade: pix ? f.pixCidade.trim() : null,
    whatsapp: f.whatsapp.trim() || null,
    entregaAtiva: f.entregaAtiva,
    taxaEntrega: paraNumero(f.taxaEntrega) ?? 0,
    pedidoMinimo: paraNumero(f.pedidoMinimo),
    horarios: f.horarios,
  };
}

// Configurações da loja (GET/PUT /admin/loja). Depois de salvar com Pix, mostra o Pix de
// teste de R$ 0,01 para conferir a chave pagando com o celular da loja.
export default function LojaConfigPage() {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [pixTeste, setPixTeste] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let ativo = true;
    adminLojaService
      .config()
      .then((c) => ativo && setForm(doConfig(c)))
      .catch((e) => ativo && setErroCarga(extractErrorMessage(e, 'Não foi possível carregar as configurações.')));
    return () => {
      ativo = false;
    };
  }, [recarga]);

  if (erroCarga) {
    return (
      <ErrorState
        message={erroCarga}
        onRetry={() => {
          setErroCarga(null);
          setRecarga((r) => r + 1);
        }}
      />
    );
  }
  if (!form) return <CardSkeleton />;

  const mudar = <K extends keyof Form>(campo: K, valor: Form[K]) => {
    setForm((f) => (f ? { ...f, [campo]: valor } : f));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };
  const mudarHorario = (indice: number, h: Partial<HorarioLoja>) =>
    mudar(
      'horarios',
      form.horarios.map((x, i) => (i === indice ? { ...x, ...h } : x)),
    );

  const salvar = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validar(form);
    setErros(e);
    setErroEnvio(null);
    if (Object.values(e).some(Boolean)) {
      setErroEnvio('Confira os campos destacados.');
      return;
    }
    setSalvando(true);
    try {
      const c = await adminLojaService.salvar(paraEnvio(form));
      setForm(doConfig(c));
      setPixTeste(c.pixExemplo);
      window.dispatchEvent(new Event(EVENTO_LOJA_SALVA));
      toast.success('Configurações salvas.');
    } catch (err) {
      setErroEnvio(extractErrorMessage(err, 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} noValidate className="mx-auto max-w-3xl space-y-5 pb-28">
      <PageHeader title="Configurações da loja" subtitle="Pix, WhatsApp, entrega e horários." />

      {pixTeste && <PixTeste codigo={pixTeste} />}

      <section className="card space-y-4 p-4 sm:p-6">
        <h2 className="font-bold text-slate-800">Loja</h2>
        <Campo id="nome" label="Nome da loja" valor={form.nome} erro={erros.nome} maxLength={100} onChange={(v) => mudar('nome', v)} />
        <Campo
          id="cidade" label="Cidade da loja" valor={form.cidade} erro={erros.cidade} maxLength={60}
          ajuda="A entrega só atende esta cidade." onChange={(v) => mudar('cidade', v)}
        />
        <Campo
          id="whatsapp" label="WhatsApp da loja" valor={form.whatsapp} erro={erros.whatsapp} inputMode="tel"
          placeholder="(16) 99999-0000" ajuda="O cliente fala com a loja por este número."
          onChange={(v) => mudar('whatsapp', maskTelefone(v))}
        />
      </section>

      <section className="card space-y-4 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-800">
          <QrCode className="h-5 w-5 text-blueberry-600" /> Pix (para receber os pedidos)
        </h2>
        <p className="text-sm text-slate-500">
          Sem Pix a loja não recebe pedidos pelo app. Use a chave da conta da loja.
        </p>
        <Campo
          id="pixChave" label="Chave Pix" valor={form.pixChave} erro={erros.pixChave} maxLength={77}
          placeholder="CPF, CNPJ, e-mail, +5516999990000 ou chave aleatória"
          onChange={(v) => mudar('pixChave', v)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="pixNomeRecebedor" label="Nome de quem recebe" valor={form.pixNomeRecebedor}
            erro={erros.pixNomeRecebedor} maxLength={60}
            ajuda={form.pixNomeRecebedor.trim() ? `No Pix: ${textoPix(form.pixNomeRecebedor, LIMITE_NOME_PIX)}` : 'Até 25 letras, sem acento.'}
            onChange={(v) => mudar('pixNomeRecebedor', v)}
          />
          <Campo
            id="pixCidade" label="Cidade de quem recebe" valor={form.pixCidade} erro={erros.pixCidade} maxLength={40}
            ajuda={form.pixCidade.trim() ? `No Pix: ${textoPix(form.pixCidade, LIMITE_CIDADE_PIX)}` : 'Até 15 letras, sem acento.'}
            onChange={(v) => mudar('pixCidade', v)}
          />
        </div>
      </section>

      <section className="card space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-slate-800">Entrega</h2>
          <Toggle checked={form.entregaAtiva} onChange={(v) => mudar('entregaAtiva', v)} label="Fazer entregas" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="taxaEntrega" label="Taxa de entrega (R$)" valor={form.taxaEntrega} erro={erros.taxaEntrega}
            inputMode="decimal" placeholder="8,00" onChange={(v) => mudar('taxaEntrega', v)}
          />
          <Campo
            id="pedidoMinimo" label="Pedido mínimo para entrega (R$)" valor={form.pedidoMinimo}
            erro={erros.pedidoMinimo} inputMode="decimal" placeholder="Sem mínimo"
            ajuda="Vale só para entrega, sem contar a taxa." onChange={(v) => mudar('pedidoMinimo', v)}
          />
        </div>
      </section>

      <section className="card space-y-3 p-4 sm:p-6" aria-label="Horários">
        <h2 className="font-bold text-slate-800">Horários</h2>
        <p className="text-sm text-slate-500">Dia sem horário = loja fechada. O horário não passa da meia-noite.</p>
        {erros.horarios && (
          <p role="alert" className="text-sm font-semibold text-strawberry-600">
            {erros.horarios}
          </p>
        )}
        <ul className="divide-y divide-cream-100">
          {DIAS.map((nomeDia, dia) => {
            const intervalos = form.horarios.map((h, i) => ({ h, i })).filter(({ h }) => h.diaSemana === dia);
            return (
              <li key={dia} className="flex flex-wrap items-center gap-2 py-3">
                <span className="w-20 font-semibold text-slate-700">{nomeDia}</span>
                <div className="flex flex-1 flex-col gap-2">
                  {intervalos.length === 0 && <span className="text-sm text-slate-400">Fechado</span>}
                  {intervalos.map(({ h, i }) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time" className="input w-28 px-2" aria-label={`${nomeDia}: abre`}
                        value={h.abre} onChange={(e) => mudarHorario(i, { abre: e.target.value })}
                      />
                      <span className="text-slate-400">às</span>
                      <input
                        type="time" className="input w-28 px-2" aria-label={`${nomeDia}: fecha`}
                        value={h.fecha} onChange={(e) => mudarHorario(i, { fecha: e.target.value })}
                      />
                      <button
                        type="button" className="rounded-full p-2 text-slate-400 hover:bg-cream-100"
                        aria-label={`Remover horário de ${nomeDia}`}
                        onClick={() => mudar('horarios', form.horarios.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button" className="btn-ghost px-3 py-2 text-xs"
                  onClick={() => mudar('horarios', [...form.horarios, { diaSemana: dia, abre: '13:00', fecha: '22:00' }])}
                >
                  <Plus className="h-4 w-4" /> {intervalos.length ? 'Outro horário' : 'Abrir'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {erroEnvio && (
        <p role="alert" className="rounded-2xl bg-strawberry-100 px-4 py-3 text-sm font-semibold text-strawberry-700">
          {erroEnvio}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <button type="submit" className="btn-primary w-full py-4 text-base" disabled={salvando}>
            {salvando ? <Spinner className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            {salvando ? 'Salvando…' : 'Salvar configurações'}
          </button>
        </div>
      </div>
    </form>
  );
}

function PixTeste({ codigo }: { codigo: string }) {
  const toast = useToast();
  const [copiado, setCopiado] = useState(false);
  const aoCopiar = async () => {
    if (await copiar(codigo)) {
      setCopiado(true);
      toast.success('Código do Pix de teste copiado.');
      setTimeout(() => setCopiado(false), 3000);
    } else {
      toast.error('Não foi possível copiar. Selecione o código e copie.');
    }
  };
  return (
    <section aria-label="Pix de teste" className="card space-y-3 border-2 border-mint-300 p-4 text-center sm:p-6">
      <h2 className="text-lg font-bold text-slate-800">Pix de teste: R$ 0,01</h2>
      <p className="font-semibold text-mint-700">
        Pague com o celular da loja e confira se caiu na conta certa.
      </p>
      <QrCodePix codigo={codigo} />
      <button type="button" className="btn-primary mx-auto" onClick={() => void aoCopiar()}>
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        Copiar código do Pix de teste
      </button>
      <textarea
        readOnly
        aria-label="Código do Pix de teste"
        className="input min-h-16 break-all font-mono text-xs"
        value={codigo}
        onFocus={(e) => e.target.select()}
      />
    </section>
  );
}

function Campo({
  id,
  label,
  valor,
  erro,
  ajuda,
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  valor: string;
  erro?: string;
  ajuda?: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'>) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        className={`input ${erro ? 'input-error' : ''}`}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!erro}
        aria-describedby={erro || ajuda ? `${id}-ajuda` : undefined}
        {...rest}
      />
      {(erro || ajuda) && (
        <p id={`${id}-ajuda`} className={`mt-1 text-xs ${erro ? 'font-semibold text-strawberry-600' : 'text-slate-400'}`}>
          {erro ?? ajuda}
        </p>
      )}
    </div>
  );
}
