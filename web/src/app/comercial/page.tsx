import { GerarApuracaoForm } from './gerar-apuracao-form'

// MVP: gera a apuração de um consultor por vez, por código. Uma tela para gerar em lote (todos
// os consultores de uma vez) fica para depois de validar esse fluxo com o cliente — consultores
// com muitos veículos demoram bastante (ver nota em src/lib/apuracao/mensal.ts).
export default function ComercialDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Gerar apuração mensal</h2>
        <p className="text-sm text-slate-500">
          Busca os dados no Ileva e calcula adesão + recorrência do consultor no mês informado.
        </p>
      </div>
      <GerarApuracaoForm />
    </div>
  )
}
