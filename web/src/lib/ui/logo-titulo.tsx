import Image from 'next/image'

// Usado no header dos 2 painéis (Gestor, Consultor) — logo + título juntos no canto esquerdo,
// no lugar do <h1> solto que existia antes.
export function LogoTitulo({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/Logo Protege Club.png"
        alt="Protege Club"
        width={30}
        height={30}
        priority
        className="h-[30px] w-[30px]"
      />
      <h1 className="text-sm font-medium text-slate-500">{titulo}</h1>
    </div>
  )
}
