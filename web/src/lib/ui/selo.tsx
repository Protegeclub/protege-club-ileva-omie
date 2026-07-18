// Badge de status — cor semântica (não é cor de marca, é convenção universal de UI: verde =
// sucesso/positivo) preservada de propósito, ver seção sobre cores semânticas no plano de rebrand.
export function Selo({
  children,
  tom = 'sucesso',
}: {
  children: React.ReactNode
  tom?: 'sucesso' | 'neutro'
}) {
  const classes =
    tom === 'sucesso'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {children}
    </span>
  )
}
