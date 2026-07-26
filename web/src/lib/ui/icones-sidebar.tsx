// Ícones inline (SVG simples, sem dependência nova) usados no menu lateral dos dois painéis —
// mesmo estilo de web/src/app/gestor/gerar/icones.tsx.
export function IconeDashboard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function IconeAdesao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9.5 15c0 1.1 1.1 2 2.5 2s2.5-.7 2.5-1.8-1-1.6-2.5-2-2.5-.9-2.5-2 1.1-1.8 2.5-1.8 2.5.9 2.5 2M12 6.5v11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconeRecorrencia({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M20 11a8 8 0 0 0-14.5-4.5M4 4v4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 13a8 8 0 0 0 14.5 4.5M20 20v-4h-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconeRastreador({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function IconePlaca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 16v-3.2c0-.5.2-.9.5-1.3L7 8.3c.4-.5 1-.8 1.6-.8h6.8c.6 0 1.2.3 1.6.8l2.5 3.2c.3.4.5.8.5 1.3V16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M3.5 16h17v2.2c0 .7-.5 1.3-1.2 1.3H4.7c-.7 0-1.2-.6-1.2-1.3V16Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="7.5" cy="16" r="1.3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="16" r="1.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function IconeAlerta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 4 3 20h18L12 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  )
}

export function IconeLista({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="4.5" cy="6" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1.2" fill="currentColor" />
      <path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconeUsuarios({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M15.5 5.3a3 3 0 0 1 0 5.7M18.5 19.5c0-2.5-1.7-4.3-4-4.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function IconeSair({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M10 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 12H3m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconeColapsar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Ícones de KPI compartilhados entre Consultores, Gerar apuração e Dashboard.
export function IconeCarteira({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9H6.5A2.5 2.5 0 0 1 4 6.5v1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M4 6.5v10A2.5 2.5 0 0 0 6.5 19h11a2.5 2.5 0 0 0 2.5-2.5V9H16a2 2 0 1 0 0 4h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconeApurado({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconeSeta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconeTrofeu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M7 4h10v5a5 5 0 0 1-10 0V4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 14v3M9 20h6M9.5 20c0-1.7.9-2.6 2.5-3 1.6.4 2.5 1.3 2.5 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconeAtualizar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M17 4v3.5h-3.5M7 20v-3.5h3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
