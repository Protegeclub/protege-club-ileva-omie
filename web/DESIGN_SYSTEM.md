# Protege Club — Design System (UI)

Carregado automaticamente em toda sessão (`web/CLAUDE.md` importa este arquivo) — não é
preciso pedir pra ler, ele já está no contexto. Qualquer decisão visual nova deve respeitar o
que está aqui; se este arquivo não cobrir o caso, perguntar antes de inventar um padrão novo.

## Filosofia

Este é um software **SaaS corporativo** (apuração de comissões) — não uma landing page, não um
site institucional. Todo redesign prioriza, nessa ordem: simplicidade, hierarquia visual,
consistência, legibilidade, performance. Referência de qualidade (inspiração, nunca cópia
literal): Stripe Dashboard, Linear, Clerk, HubSpot, Notion, Mercury, Vercel.

## Regra mais importante: arte institucional nunca é desenhada em código

- **Interface** (cards, tabelas, gráficos, formulários, filtros, botões, modais, navegação) é
  sempre React + Tailwind, construída normalmente.
- **Arte institucional** (banners, ilustrações, mockups, hero images, composições gráficas de
  fundo) é **sempre um asset estático** (PNG/WEBP/SVG) fornecido pelo Samuel. O código só
  posiciona (`<Image fill className="object-cover">` ou equivalente + um overlay **plano** de
  contraste, se precisar). Nunca desenhar grid de pontos, ondas, círculos decorativos, mockup de
  dashboard "flutuando" ou qualquer composição gráfica via CSS/SVG pra simular uma peça de
  design — isso sempre acaba com cara de wireframe, não de produto premium.
  - Convenção de local: `public/images/<nome-da-tela>.<ext>` (ex.: `login-left.png`) — a
    extensão é a que o Samuel fornecer (PNG/WEBP/SVG), não precisa ser sempre `.webp`. Enquanto
    o asset não chega, usar um fallback de cor sólida da marca (`bg-brand-navy`), nunca uma
    composição tentando simular a arte.
  - **Nunca reprocessar/reconverter o arquivo que o Samuel entrega** (ex.: converter PNG→WEBP
    "pra otimizar") — isso já causou perda real de qualidade e alteração de cor (03/08/2026,
    tela de login). Salvar o arquivo exatamente como entregue, e usar a prop `unoptimized` no
    `<Image>` pra impedir o Next de re-comprimir de novo no próprio pipeline de otimização
    (default: recodifica pra webp/avif a ~75% de qualidade, uma segunda perda por cima da
    primeira). Peça de arte institucional carrega pouco (aparece uma vez, não em lista/tabela) —
    o ganho de banda da otimização automática não vale o risco de degradar a arte.
- **Ícones pequenos/funcionais** (menu, usuário, cadeado, check, configurações, seta) **não**
  entram nessa regra — são interface, não arte, e continuam sendo SVG desenhado à mão (ver
  "Ícones" abaixo).

## Cores

Definidas em `src/app/globals.css` (`--brand-*`), expostas como classes Tailwind
(`bg-brand-navy`, `text-brand-orange`, etc.) — nunca usar hex solto no meio do código.

| Token | Hex | Uso |
|---|---|---|
| `brand-navy` | `#002a54` | Cor institucional principal — sidebar, texto de destaque, botão primário |
| `brand-navy-hover` | `#001d3d` | Hover de elementos navy (tom próprio, não opacidade — opacity clareia, não escurece) |
| `brand-blue` | `#25a9e1` | Foco de input, links, dado secundário em gráficos (ex. recorrência) |
| `brand-orange` | `#f19100` | Cor de destaque/CTA — botão principal, badges "gerado", acentos de marca |
| `brand-orange-hover` | `#d97f00` | Hover de elementos orange |

Neutros: paleta `slate` do Tailwind (`slate-50` a `slate-900`) para fundos, bordas e texto
secundário. Vermelho/verde/âmbar do Tailwind só pra estado semântico (erro, sucesso, pendente) —
nunca decorativo.

## Tipografia

**Montserrat** (`next/font/google`, pesos 400/500/600/700 só — não a família toda). É a
substituta da Gotham (fonte oficial da marca no Manual de Identidade Visual), que não tem
licença de uso web livre — Montserrat é a alternativa geométrica mais próxima.

## Forma e espaçamento

- Radius padrão de card: `rounded-xl` (12px), via componente `Cartao` compartilhado — não mudar
  isso globalmente por causa de uma tela específica. Peças isoladas de destaque (card de login,
  por exemplo) podem usar radius maior (20–28px) só nelas mesmas.
- Sombra padrão: `shadow-sm` discreta (`Cartao`). Sombra mais forte é exceção reservada pra
  elemento "elevado" isolado (ex. card de login flutuando sobre fundo branco).
- Espaço em branco generoso; grids usam `gap-3`/`gap-4`/`gap-6` conforme densidade de conteúdo.

## Componentes a reutilizar (não recriar um novo por tela)

- `Cartao` / `CartaoCabecalho` — `src/lib/ui/cartao.tsx`
- `Botao` — `src/lib/ui/botao.tsx` (variantes: `primaria` navy, `secundaria` azul claro,
  `destaque` laranja para CTA principal, `fantasma` outline, `fantasma-claro` outline para fundo
  escuro)
- `CardKpi` — `src/lib/ui/card-kpi.tsx` (sparkline/anel de progresso opcionais, ver Dashboard e
  Consultores)
- Sidebar — `gestor/sidebar.tsx`, `consultor/sidebar.tsx` + `ItemNavSidebar`
  (`lib/ui/item-nav-sidebar.tsx`)
- `Banner` — `src/lib/ui/banner.tsx` (mensagem de erro/sucesso em formulário)

## Ícones

SVG desenhado à mão, sem lib de ícones (mantém o bundle pequeno). Compartilhados em
`lib/ui/icones-sidebar.tsx`; específicos de uma tela ficam localizados (`app/login/icones.tsx`,
`app/gestor/gerar/icones.tsx`). Isso é interface, não arte — não entra na regra de "arte é
sempre asset" acima.

## Responsividade

Desktop-first: construir pensando na tela grande primeiro, depois reduzir graciosamente —
tablet perde densidade/conteúdo secundário, mobile mostra só o essencial. Nunca quebrar layout.
Exemplo already implementado: painel institucional do login some em mobile, perde a lista de
benefícios em tablet, aparece completo só em desktop.

## Objetivo

Toda tela deve transmitir: software premium, confiável, rápido, ambiente corporativo. Nunca
parecer template genérico ou landing page.

---

*Este arquivo é intencionalmente único por enquanto (não dividido em `/docs/COLORS.md`,
`TYPOGRAPHY.md`, etc.) — mais simples de manter enquanto o sistema ainda está em redesign
ativo. Se crescer demais ou o time aumentar, vale separar por tópico.*
