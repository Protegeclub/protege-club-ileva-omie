import Image from 'next/image'

// Usado no header dos 2 painéis (Gestor, Consultor) — logo + título juntos no canto esquerdo,
// no lugar do <h1> solto que existia antes. Logo em 40×40 (fonte é 512×512, tinha folga de
// resolução de sobra em 30×30) com um divisor vertical separando do título, título em navy pra
// puxar a cor institucional pro elemento mais visível do header.
export function LogoTitulo({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/Logo Protege Club.png"
        alt="Protege Club"
        width={40}
        height={40}
        priority
        className="h-10 w-10"
      />
      <div className="h-6 w-px bg-slate-200" aria-hidden />
      <h1 className="text-sm font-semibold text-brand-navy">{titulo}</h1>
    </div>
  )
}
