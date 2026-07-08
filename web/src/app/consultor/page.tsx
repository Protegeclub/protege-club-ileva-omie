// Placeholder — os cards reais (adesões, recorrência, desconto de rastreador, premiação,
// inadimplentes) entram aqui conforme docs/REQUISITOS.md, seção 6, e o checklist 6.7 em
// CONTEXTO_E_CHECKLIST.md. Depende dos dados do Ileva estarem sincronizados (checklist 6.4).
export default function ConsultorDashboardPage() {
  const cards = [
    { titulo: 'Adesões no mês', valor: '—' },
    { titulo: 'Recorrência do mês', valor: '—' },
    { titulo: 'Desconto de rastreador', valor: '—' },
    { titulo: 'Premiação (plano de carreira)', valor: '—' },
    { titulo: 'Inadimplentes na carteira', valor: '—' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.titulo} className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">{card.titulo}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{card.valor}</p>
        </div>
      ))}
    </div>
  )
}
