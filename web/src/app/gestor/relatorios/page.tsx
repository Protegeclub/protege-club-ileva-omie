import { Suspense } from 'react'
import { listarEquipesDisponiveis, listarTodosConsultores } from '@/lib/ileva/api'
import { SeletorRelatorio } from './seletor-relatorio'

// Página única de geração de relatórios (PDF) do Gestor — substitui os botões "Baixar PDF"/
// "Gerar PDF" que antes estavam espalhados em mais de 10 telas diferentes. Não introduz nenhuma
// lógica nova: monta os mesmos links que esses botões já montavam, pros mesmos 3 endpoints que
// já existiam (/api/relatorios/consolidado, /api/relatorios/gestor/todos,
// /api/relatorios/consultor) — zero mudança de backend.
export default async function GestorRelatoriosPage() {
  const consultores = (await listarTodosConsultores())
    .filter((c) => c.situacao === 'Ativo')
    .map((c) => ({ cod_consultor: c.cod_consultor, nome: c.nome, equipe: c.equipe || '—' }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const equipesDisponiveis = listarEquipesDisponiveis(consultores)

  const hoje = new Date()
  const anoInicial = hoje.getFullYear()
  const mesInicial = hoje.getMonth() + 1
  const ultimoDiaDoMes = new Date(anoInicial, mesInicial, 0).getDate()
  const dataInicioPadrao = `${anoInicial}-${String(mesInicial).padStart(2, '0')}-01`
  const dataFimPadrao = `${anoInicial}-${String(mesInicial).padStart(2, '0')}-${String(ultimoDiaDoMes).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">Relatórios</h1>
        <p className="mt-1 text-sm text-slate-500">
          Escolha o recorte e baixe o PDF organizado — todos os relatórios do sistema agora saem daqui.
        </p>
      </div>

      {/* Suspense por causa do useSearchParams no Client Component — exigência do Next.js. */}
      <Suspense fallback={null}>
        <SeletorRelatorio
          consultores={consultores}
          equipesDisponiveis={equipesDisponiveis}
          anoInicial={anoInicial}
          mesInicial={mesInicial}
          dataInicioPadrao={dataInicioPadrao}
          dataFimPadrao={dataFimPadrao}
        />
      </Suspense>
    </div>
  )
}
