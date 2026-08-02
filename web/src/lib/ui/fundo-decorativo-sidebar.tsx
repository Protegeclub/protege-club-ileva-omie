// Ondas decorativas do fundo navy do menu lateral — puro enfeite (referência visual mandada
// pelo Samuel, 02/08/2026), SVG estático desenhado à mão, sem lib nova. `aria-hidden` +
// `pointer-events-none`: nunca deve interceptar clique nem ser lido por leitor de tela. Fica
// atrás de todo o conteúdo do menu via z-index negativo (o pai, <aside>, é `position: sticky`,
// que já cria contexto de empilhamento próprio — não precisa de nenhum wrapper extra nos itens
// existentes do menu).
export function FundoDecorativoSidebar() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none">
      <svg className="absolute -top-16 -left-14 h-72 w-72 text-white" viewBox="0 0 200 200" fill="none">
        <path d="M-20 55 C 40 15, 80 95, 140 45 S 220 15, 270 65" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />
        <path d="M-20 95 C 40 55, 90 135, 150 85 S 230 55, 280 105" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1.5" />
        <path d="M-20 135 C 50 95, 100 175, 160 125 S 230 95, 280 145" stroke="currentColor" strokeOpacity="0.045" strokeWidth="1.5" />
      </svg>
      <svg className="absolute -bottom-24 -right-16 h-96 w-96 text-white" viewBox="0 0 240 240" fill="none">
        <circle cx="130" cy="120" r="100" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
        <circle cx="130" cy="120" r="72" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        <path d="M-20 150 C 40 105, 95 195, 160 140 S 250 105, 300 160" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.5" />
        <path d="M-20 190 C 40 145, 95 235, 160 180 S 250 145, 300 200" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
