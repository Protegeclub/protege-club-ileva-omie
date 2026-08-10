'use client'

import { useMemo, useState } from 'react'
import { Banner } from '@/lib/ui/banner'
import { Botao } from '@/lib/ui/botao'
import { Cartao } from '@/lib/ui/cartao'
import { LinhaVazia } from '@/lib/ui/linha-vazia'
import { Selo } from '@/lib/ui/selo'
import {
  buscarClientesOmieAction,
  buscarOpcoesConfiguracao,
  confirmarVinculoAction,
  enviarContaPagarAction,
  salvarConfiguracaoOmieAction,
  type ConfiguracaoOmie,
  type LinhaOmie,
} from './actions'

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Dia 15 do mês seguinte ao apurado — mesmo dia em que a recorrência já é creditada ao
// consultor hoje (ver docs/GANHOS E INCETIVOS CORRETO ATUALIZADO.pdf), usado só como sugestão
// inicial de vencimento; o Gestor pode alterar antes de confirmar o envio.
function vencimentoPadrao(ano: number, mes: number): string {
  const data = new Date(ano, mes, 15) // mes (0-indexed + 1) já cai no mês seguinte
  const dd = String(data.getDate()).padStart(2, '0')
  const mm = String(data.getMonth() + 1).padStart(2, '0')
  return `${data.getFullYear()}-${mm}-${dd}`
}

function paraDataBr(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-')
  return `${dia}/${mes}/${ano}`
}

// Categoria financeira tem ~130 opções e conta corrente também acumula bastante (ver
// lib/omie/client.ts) — um <select> nativo simples exigia rolar a lista inteira pra achar uma.
// Mesmo padrão de busca já usado abaixo (vínculo de cliente Omie por nome): campo de texto filtra
// uma lista clicável. Genérico (não só categoria) pra reaproveitar exatamente a mesma busca na
// conta corrente, em vez de duplicar o mesmo componente com nomes diferentes.
function SeletorBusca<T>({
  itens,
  valorEscolhido,
  onEscolher,
  obterValor,
  obterRotulo,
  placeholder,
}: {
  itens: T[]
  valorEscolhido: string
  onEscolher: (valor: string) => void
  obterValor: (item: T) => string
  obterRotulo: (item: T) => string
  placeholder: string
}) {
  const [termo, setTermo] = useState('')
  const [buscando, setBuscando] = useState(!valorEscolhido)
  const itemAtual = itens.find((item) => obterValor(item) === valorEscolhido)

  const filtrados = useMemo(() => {
    const termoNormalizado = termo.trim().toLowerCase()
    if (!termoNormalizado) return itens
    return itens.filter((item) => obterRotulo(item).toLowerCase().includes(termoNormalizado))
  }, [itens, termo, obterRotulo])

  if (!buscando && itemAtual) {
    return (
      <div className="mt-1.5 flex h-10 items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 text-sm">
        <span className="truncate text-slate-700">{obterRotulo(itemAtual)}</span>
        <button type="button" className="shrink-0 text-xs text-brand-blue hover:underline" onClick={() => setBuscando(true)}>
          Trocar
        </button>
      </div>
    )
  }

  return (
    <div>
      <input
        type="text"
        placeholder={placeholder}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
      />
      <div className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
        {filtrados.length === 0 ? (
          <p className="p-2 text-xs text-slate-400">Nenhum resultado encontrado.</p>
        ) : (
          filtrados.map((item) => {
            const valor = obterValor(item)
            return (
              <button
                key={valor}
                type="button"
                onClick={() => {
                  onEscolher(valor)
                  setTermo('')
                  setBuscando(false)
                }}
                className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                  valor === valorEscolhido ? 'bg-sky-50 font-medium text-brand-navy' : 'text-slate-700'
                }`}
              >
                {obterRotulo(item)}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function ConfiguracaoOmieCard({
  configuracaoInicial,
}: {
  configuracaoInicial: ConfiguracaoOmie
}) {
  const [config, setConfig] = useState(configuracaoInicial)
  const [editando, setEditando] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [opcoes, setOpcoes] = useState<Awaited<ReturnType<typeof buscarOpcoesConfiguracao>> | null>(null)
  const [categoriaEscolhida, setCategoriaEscolhida] = useState('')
  const [contaEscolhida, setContaEscolhida] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function abrirEdicao() {
    setEditando(true)
    setErro('')
    if (!opcoes) {
      setCarregando(true)
      const resultado = await buscarOpcoesConfiguracao()
      setCarregando(false)
      if ('erro' in resultado) {
        setErro(resultado.erro)
        return
      }
      setOpcoes(resultado)
    }
  }

  async function salvar() {
    if (!opcoes || 'erro' in opcoes || !categoriaEscolhida || !contaEscolhida) return
    setSalvando(true)
    setErro('')
    const categoria = opcoes.categorias.find((c) => c.codigo === categoriaEscolhida)
    const conta = opcoes.contas.find((c) => String(c.nCodCC) === contaEscolhida)
    if (!categoria || !conta) {
      setErro('Selecione categoria e conta corrente.')
      setSalvando(false)
      return
    }
    const resultado = await salvarConfiguracaoOmieAction(categoria.codigo, categoria.descricao, conta.nCodCC, conta.descricao)
    setSalvando(false)
    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Erro ao salvar.')
      return
    }
    setConfig({
      codigoCategoria: categoria.codigo,
      descricaoCategoria: categoria.descricao,
      codigoContaCorrente: conta.nCodCC,
      descricaoContaCorrente: conta.descricao,
    })
    setEditando(false)
  }

  const configurado = !!config.codigoCategoria && !!config.codigoContaCorrente

  return (
    <Cartao className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Configuração do Omie</p>
          {configurado && !editando ? (
            <p className="mt-1 text-xs text-slate-500">
              Categoria: <span className="font-medium text-slate-700">{config.descricaoCategoria}</span>
              {'  ·  '}Conta corrente:{' '}
              <span className="font-medium text-slate-700">{config.descricaoContaCorrente}</span>
            </p>
          ) : !editando ? (
            <p className="mt-1 text-xs text-amber-600">
              Ainda não configurado — defina antes de poder enviar qualquer título ao Omie.
            </p>
          ) : null}
        </div>
        {!editando && (
          <Botao type="button" variante="fantasma" tamanho="sm" onClick={abrirEdicao}>
            {configurado ? 'Alterar' : 'Configurar'}
          </Botao>
        )}
      </div>

      {editando && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {carregando ? (
            <p className="text-sm text-slate-400">Carregando categorias e contas do Omie…</p>
          ) : opcoes && !('erro' in opcoes) ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Categoria financeira</label>
                  <SeletorBusca
                    itens={opcoes.categorias}
                    valorEscolhido={categoriaEscolhida}
                    onEscolher={setCategoriaEscolhida}
                    obterValor={(c) => c.codigo}
                    obterRotulo={(c) => c.descricao}
                    placeholder="Buscar categoria…"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Conta corrente</label>
                  <SeletorBusca
                    itens={opcoes.contas}
                    valorEscolhido={contaEscolhida}
                    onEscolher={setContaEscolhida}
                    obterValor={(c) => String(c.nCodCC)}
                    obterRotulo={(c) => `${c.descricao} (${c.tipo})`}
                    placeholder="Buscar conta corrente…"
                  />
                </div>
              </div>
              {erro && <p className="text-sm text-red-600">{erro}</p>}
              <div className="flex gap-2">
                <Botao type="button" variante="destaque" tamanho="sm" disabled={salvando} onClick={salvar}>
                  {salvando ? 'Salvando…' : 'Salvar configuração'}
                </Botao>
                <Botao type="button" variante="fantasma" tamanho="sm" onClick={() => setEditando(false)}>
                  Cancelar
                </Botao>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-600">{opcoes && 'erro' in opcoes ? opcoes.erro : erro}</p>
          )}
        </div>
      )}
    </Cartao>
  )
}

function LinhaConsultorOmie({
  linha,
  configurado,
  ano,
  mes,
  onVinculado,
}: {
  linha: LinhaOmie
  configurado: boolean
  ano: number
  mes: number
  onVinculado: (codConsultor: number, vinculo: { codigo_cliente_omie: number; nome_omie: string }) => void
}) {
  const [buscando, setBuscando] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<
    { codigo_cliente_omie: number; nome: string; cnpj_cpf: string }[] | null
  >(null)
  const [vinculando, setVinculando] = useState(false)

  const [enviarAberto, setEnviarAberto] = useState(false)
  const [vencimento, setVencimento] = useState(vencimentoPadrao(ano, mes))
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [statusEnvio, setStatusEnvio] = useState(linha.statusEnvio)

  async function confirmarVinculo(codigoClienteOmie: number, nome: string) {
    setVinculando(true)
    const resultado = await confirmarVinculoAction(linha.cod_consultor, codigoClienteOmie, nome)
    setVinculando(false)
    if (resultado.ok) {
      onVinculado(linha.cod_consultor, { codigo_cliente_omie: codigoClienteOmie, nome_omie: nome })
    }
  }

  async function buscarManualmente(valor: string) {
    setTermoBusca(valor)
    if (valor.trim().length < 3) {
      setResultadosBusca(null)
      return
    }
    setBuscando(true)
    const resultado = await buscarClientesOmieAction(valor)
    setBuscando(false)
    setResultadosBusca('erro' in resultado ? [] : resultado)
  }

  async function confirmarEnvio() {
    if (!linha.apuracaoId) return
    setEnviando(true)
    setErroEnvio('')
    const resultado = await enviarContaPagarAction(linha.apuracaoId, linha.cod_consultor, linha.totalLiquido, paraDataBr(vencimento))
    setEnviando(false)
    if (!resultado.ok) {
      setErroEnvio(resultado.erro ?? 'Erro desconhecido.')
      return
    }
    setStatusEnvio('enviado')
    setEnviarAberto(false)
  }

  return (
    <tr className="border-b border-slate-100 align-top last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800">{linha.nomeConsultor}</p>
        <p className="text-xs text-slate-400">#{linha.cod_consultor}</p>
      </td>
      <td className="px-4 py-3 font-semibold text-slate-800">{formatarMoeda(linha.totalLiquido)}</td>
      <td className="px-4 py-3">
        {linha.vinculo ? (
          <p className="text-emerald-700">✓ {linha.vinculo.nome_omie}</p>
        ) : (
          <div className="space-y-2">
            {linha.sugestoes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {linha.sugestoes.map((s) => (
                  <button
                    key={s.cliente.codigo_cliente_omie}
                    type="button"
                    disabled={vinculando}
                    onClick={() => confirmarVinculo(s.cliente.codigo_cliente_omie, s.cliente.razao_social || s.cliente.nome_fantasia)}
                    className="rounded-full border border-brand-blue/40 bg-sky-50 px-2.5 py-1 text-xs text-brand-navy hover:bg-sky-100 disabled:opacity-50"
                    title={s.cliente.cnpj_cpf}
                  >
                    {s.cliente.razao_social || s.cliente.nome_fantasia}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder="Buscar por nome ou CPF/CNPJ…"
              value={termoBusca}
              onChange={(e) => buscarManualmente(e.target.value)}
              className="h-8 w-full max-w-xs rounded-md border border-slate-300 px-2 text-xs focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
            {buscando && <p className="text-xs text-slate-400">Buscando…</p>}
            {resultadosBusca && resultadosBusca.length > 0 && (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5">
                {resultadosBusca.map((r) => (
                  <button
                    key={r.codigo_cliente_omie}
                    type="button"
                    disabled={vinculando}
                    onClick={() => confirmarVinculo(r.codigo_cliente_omie, r.nome)}
                    className="block w-full rounded px-1.5 py-1 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {r.nome} <span className="text-slate-400">{r.cnpj_cpf}</span>
                  </button>
                ))}
              </div>
            )}
            {resultadosBusca && resultadosBusca.length === 0 && (
              <p className="text-xs text-slate-400">Nenhum cliente/fornecedor encontrado no Omie.</p>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {statusEnvio === 'enviado' ? (
          <Selo tom="sucesso">Enviado</Selo>
        ) : statusEnvio === 'erro' ? (
          <Selo tom="erro">Erro no envio</Selo>
        ) : (
          <Selo tom="neutro">Não enviado</Selo>
        )}
      </td>
      <td className="px-4 py-3">
        {statusEnvio === 'enviado' ? (
          <span className="text-xs text-slate-400">—</span>
        ) : !enviarAberto ? (
          <Botao
            type="button"
            variante="secundaria"
            tamanho="sm"
            disabled={!linha.vinculo || !configurado}
            title={!linha.vinculo ? 'Confirme o vínculo primeiro' : !configurado ? 'Configure categoria/conta corrente primeiro' : ''}
            onClick={() => setEnviarAberto(true)}
          >
            Enviar
          </Botao>
        ) : (
          <div className="w-48 space-y-1.5">
            <label className="block text-xs font-medium text-slate-500">Vencimento</label>
            <input
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
            {erroEnvio && <p className="text-xs text-red-600">{erroEnvio}</p>}
            <div className="flex gap-1.5">
              <Botao type="button" variante="destaque" tamanho="sm" disabled={enviando} onClick={confirmarEnvio}>
                {enviando ? 'Enviando…' : 'Confirmar e criar no Omie'}
              </Botao>
              <Botao type="button" variante="fantasma" tamanho="sm" onClick={() => setEnviarAberto(false)}>
                Cancelar
              </Botao>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}

export function TabelaOmie({
  linhasIniciais,
  configuracaoInicial,
  ano,
  mes,
}: {
  linhasIniciais: LinhaOmie[]
  configuracaoInicial: ConfiguracaoOmie
  ano: number
  mes: number
}) {
  const [linhas, setLinhas] = useState(linhasIniciais)
  const configurado = !!configuracaoInicial.codigoCategoria && !!configuracaoInicial.codigoContaCorrente

  const totais = useMemo(() => {
    const pendentes = linhas.filter((l) => l.statusEnvio !== 'enviado')
    return {
      total: linhas.length,
      semVinculo: linhas.filter((l) => !l.vinculo).length,
      pendentes: pendentes.length,
      valorPendente: pendentes.reduce((s, l) => s + l.totalLiquido, 0),
    }
  }, [linhas])

  function marcarVinculado(codConsultor: number, vinculo: { codigo_cliente_omie: number; nome_omie: string }) {
    setLinhas((prev) => prev.map((l) => (l.cod_consultor === codConsultor ? { ...l, vinculo, sugestoes: [] } : l)))
  }

  return (
    <div className="space-y-4">
      <ConfiguracaoOmieCard configuracaoInicial={configuracaoInicial} />

      {totais.semVinculo > 0 && (
        <Banner tom="aviso">
          {totais.semVinculo} consultor(es) ainda sem vínculo confirmado com um cliente/fornecedor do Omie.
        </Banner>
      )}

      <Cartao className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-500">
            {totais.total} consultor(es) com líquido a pagar neste período · {totais.pendentes} ainda não
            enviados ({formatarMoeda(totais.valorPendente)})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Consultor</th>
                <th className="px-4 py-3 font-medium">Total líquido</th>
                <th className="px-4 py-3 font-medium">Vínculo Omie</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <LinhaConsultorOmie
                  key={linha.cod_consultor}
                  linha={linha}
                  configurado={configurado}
                  ano={ano}
                  mes={mes}
                  onVinculado={marcarVinculado}
                />
              ))}
              {linhas.length === 0 && (
                <LinhaVazia colSpan={5} texto="Nenhum consultor com apuração e líquido positivo neste período." />
              )}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  )
}
