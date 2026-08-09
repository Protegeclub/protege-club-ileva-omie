import Link from 'next/link'
import { listarTodosConsultores } from '@/lib/ileva/api'
import { Botao } from '@/lib/ui/botao'
import { BotaoAtualizarPagina } from '@/lib/ui/botao-atualizar-pagina'
import { CardMetrica } from '@/lib/ui/card-metrica'
import { Cartao } from '@/lib/ui/cartao'
import { IconeAlerta, IconeUsuarios } from '@/lib/ui/icones-sidebar'
import { buscarStatusCompetencia, type StatusCompetencia } from './actions'
import { GerarApuracaoForm } from './gerar-apuracao-form'
import { GerarLoteForm } from './gerar-lote-form'
import {
  IconeCamadas,
  IconeCheckCircle,
  IconeRelampago,
  IconeRelogio,
  IconeSinal,
  IconeSpinner,
  IconeXCircle,
} from './icones'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarDataHora(iso: string) {
  const data = new Date(iso)
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const hoje = new Date()
  const mesmoDia = data.toDateString() === hoje.toDateString()
  return mesmoDia
    ? `Hoje às ${hora}`
    : `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`
}

export default async function GestorGerarPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()
  const ano = Number(params.ano) || hoje.getFullYear()
  const mes = Number(params.mes) || hoje.getMonth() + 1

  let consultores: { cod_consultor: number; nome: string; equipe: string }[] = []
  let ilevaOnline = true

  try {
    consultores = (await listarTodosConsultores())
      .filter((c) => c.situacao === 'Ativo')
      .map((c) => ({ cod_consultor: c.cod_consultor, nome: c.nome, equipe: c.equipe }))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  } catch {
    ilevaOnline = false
  }

  const statusCompetencia: StatusCompetencia | null = ilevaOnline
    ? await buscarStatusCompetencia(
        ano,
        mes,
        consultores.map((c) => c.cod_consultor)
      )
    : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/gestor/consultores" className="text-xs text-slate-400 hover:text-brand-navy hover:underline">
            ← Voltar para consultores
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy">Centro de Apuração</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sincronização automática de comissões entre a API do Ileva e o sistema ProtegeClub.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BotaoAtualizarPagina />
          <Botao href="#apuracao-em-lote" variante="secundaria" className="h-11">
            <IconeRelampago className="h-4 w-4" />
            Gerar apuração
          </Botao>
          <Botao href="#historico" variante="fantasma" className="h-11">
            <IconeRelogio className="h-4 w-4" />
            Histórico
          </Botao>
        </div>
      </div>

      {!ilevaOnline && (
        <Cartao className="flex items-center gap-3 border-red-200 bg-red-50 p-4 text-red-700">
          <IconeAlerta className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">API do Ileva indisponível no momento</p>
            <p className="text-xs text-red-600">
              Não foi possível carregar a lista de consultores. Tente atualizar a página em alguns instantes.
            </p>
          </div>
        </Cartao>
      )}

      {/* Filtro de competência — escolhe qual mês/ano checar (o resto da página, abaixo, reflete
          esse período). Sem isso a tela só mostrava o mês corrente, sem jeito de conferir se um
          mês passado ficou pendente. */}
      <Cartao className="flex flex-wrap items-end gap-3 p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="mes" className="block text-xs font-medium text-slate-500">
              Mês
            </label>
            <select
              id="mes"
              name="mes"
              defaultValue={mes}
              className="mt-1.5 h-11 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            >
              {NOMES_MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>{nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ano" className="block text-xs font-medium text-slate-500">
              Ano
            </label>
            <input
              id="ano"
              name="ano"
              type="number"
              defaultValue={ano}
              className="mt-1.5 h-11 w-24 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-700 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
          </div>
          <Botao type="submit" variante="primaria" className="h-11">Ver competência</Botao>
        </form>
      </Cartao>

      {/* Status geral */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <ChipStatus
          icone={<IconeSinal className={ilevaOnline ? 'text-emerald-500' : 'text-red-500'} />}
          titulo="API Ileva"
          valor={ilevaOnline ? 'Online' : 'Offline'}
        />
        <ChipStatus
          icone={<IconeRelogio />}
          titulo="Última sincronização"
          valor={statusCompetencia?.ultimaExecucao ? formatarDataHora(statusCompetencia.ultimaExecucao) : '—'}
        />
        <ChipStatus icone={<IconeCamadas />} titulo="Competência" valor={`${NOMES_MESES[mes - 1]} ${ano}`} />
        <ChipStatus
          icone={<IconeUsuarios />}
          titulo="Consultores ativos"
          valor={String(statusCompetencia?.totalAtivos ?? consultores.length)}
        />
        <ChipStatus icone={<IconeUsuarios />} titulo="Executado por" valor={statusCompetencia?.executadoPor ?? '—'} />
      </div>

      {/* Status da competência — card principal */}
      {statusCompetencia && <CardStatusCompetencia status={statusCompetencia} ano={ano} mes={mes} />}

      {/* KPIs */}
      {statusCompetencia && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <CardMetrica icone={<IconeUsuarios />} cor="navy" titulo="Total de consultores" valor={String(statusCompetencia.totalAtivos)} />
          <CardMetrica icone={<IconeCheckCircle />} cor="emerald" titulo="Processados" valor={String(statusCompetencia.processados)} />
          <CardMetrica
            icone={<IconeRelogio />}
            cor="orange"
            titulo="Pendentes"
            valor={String(statusCompetencia.pendentes + statusCompetencia.processando)}
          />
          <CardMetrica icone={<IconeXCircle />} cor="blue" titulo="Erros" valor={String(statusCompetencia.erros)} />
        </div>
      )}

      <GerarApuracaoForm anoInicial={ano} mesInicial={mes} />
      <GerarLoteForm consultores={consultores} anoInicial={ano} mesInicial={mes} />
    </div>
  )
}

function ChipStatus({ icone, titulo, valor }: { icone: React.ReactNode; titulo: string; valor: string }) {
  return (
    <Cartao className="p-4">
      <div className="flex items-center gap-2 text-slate-400 [&>svg]:h-4 [&>svg]:w-4">
        {icone}
        <p className="text-[11px] font-semibold uppercase tracking-wide">{titulo}</p>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-slate-800">{valor}</p>
    </Cartao>
  )
}

const CONFIG_SITUACAO: Record<
  StatusCompetencia['situacao'],
  { classes: string; Icone: typeof IconeCheckCircle; titulo: string; mensagem: (s: StatusCompetencia) => string }
> = {
  apurado: {
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Icone: IconeCheckCircle,
    titulo: 'Apuração concluída',
    mensagem: () => 'Todos os consultores ativos foram processados neste período.',
  },
  pendente: {
    classes: 'border-amber-200 bg-amber-50 text-amber-700',
    Icone: IconeRelogio,
    titulo: 'Competência ainda não apurada',
    mensagem: () => 'Clique em "Gerar apuração de todos" para iniciar o processamento deste período.',
  },
  parcial: {
    classes: 'border-sky-200 bg-sky-50 text-sky-700',
    Icone: IconeSpinner,
    titulo: 'Apuração em andamento',
    mensagem: (s) => `${s.processados} de ${s.totalAtivos} consultores já processados.`,
  },
  erro: {
    classes: 'border-red-200 bg-red-50 text-red-700',
    Icone: IconeXCircle,
    titulo: 'Apuração com erros',
    mensagem: (s) => `${s.erros} consultor(es) não foram processados nesta competência.`,
  },
}

// Elemento de maior destaque da página — mostra de cara se o mês corrente já foi apurado, ainda
// não, está em andamento ou teve erro, sem precisar rolar a tela ou entender a tabela detalhada.
function CardStatusCompetencia({ status, ano, mes }: { status: StatusCompetencia; ano: number; mes: number }) {
  const { classes, Icone, titulo, mensagem } = CONFIG_SITUACAO[status.situacao]

  return (
    <Cartao className={`flex flex-col gap-4 border p-6 sm:flex-row sm:items-center sm:justify-between ${classes}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/60 [&>svg]:h-6 [&>svg]:w-6">
          <Icone className={status.situacao === 'parcial' ? 'animate-spin' : ''} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Competência {NOMES_MESES[mes - 1]}/{ano}
          </p>
          <p className="mt-0.5 text-lg font-bold">{titulo}</p>
          <p className="mt-1 text-sm opacity-80">{mensagem(status)}</p>
          {status.ultimaExecucao && (
            <p className="mt-2 text-xs opacity-70">
              Última execução: {formatarDataHora(status.ultimaExecucao)}
              {status.executadoPor ? ` · Executado por ${status.executadoPor}` : ''}
            </p>
          )}
        </div>
      </div>

      {status.situacao === 'apurado' && (
        <Botao href="#apuracao-em-lote" variante="destaque" className="h-11 shrink-0">
          Reprocessar competência
        </Botao>
      )}
      {(status.situacao === 'pendente' || status.situacao === 'erro') && (
        <Botao href="#apuracao-em-lote" variante="destaque" className="h-11 shrink-0">
          Gerar apuração
        </Botao>
      )}
    </Cartao>
  )
}
