'use client'

import Image from 'next/image'
import { useActionState, useState } from 'react'
import { Banner } from '@/lib/ui/banner'
import { IconeAtualizar, IconeUsuarios } from '@/lib/ui/icones-sidebar'
import { IconeSpinner } from '../gestor/gerar/icones'
import { entrar, enviarLinkRecuperacaoAction, type RecuperarSenhaEstado } from './actions'
import {
  IconeCadeado,
  IconeCheck,
  IconeEmail,
  IconeEntrar,
  IconeEscudo,
  IconeGraficoBarras,
  IconeOlho,
  IconeOlhoFechado,
} from './icones'

const estadoInicial = { erro: '' }
const estadoRecuperacaoInicial: RecuperarSenhaEstado = {}

// Redesign "estilo software corporativo" (pedido do Samuel, 03/08/2026) — abandona o tom de
// landing page (texto longo, lista com bullet) por 4 cards minimalistas, ícone + rótulo curto.
const CARDS = [
  { icone: <IconeAtualizar className="h-4 w-4" />, titulo: 'API iLeva', descricao: 'Sincronização automática' },
  { icone: <IconeGraficoBarras className="h-4 w-4" />, titulo: 'Dashboard', descricao: 'Indicadores em tempo real' },
  { icone: <IconeUsuarios className="h-4 w-4" />, titulo: 'Consultores', descricao: 'Gestão centralizada' },
  { icone: <IconeEscudo className="h-4 w-4" />, titulo: 'Segurança', descricao: 'Ambiente protegido' },
]

export function LoginForm({ temArteFundo }: { temArteFundo: boolean }) {
  const [estado, formAction, pendente] = useActionState(entrar, estadoInicial)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarRecuperacao, setMostrarRecuperacao] = useState(false)
  const [estadoRecuperacao, recuperacaoAction, pendenteRecuperacao] = useActionState(
    enviarLinkRecuperacaoAction,
    estadoRecuperacaoInicial
  )

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white">
      {/* Painel institucional — 48% em telas grandes, reduzido em tablet, escondido no mobile (só
          o card de login aparece). Layout e arte totalmente separados (pedido do Samuel,
          02/08/2026): a arte de fundo é UM único asset estático (public/images/login-left.png),
          aplicado com object-cover. Nada aqui é desenhado em CSS/SVG — só a imagem + os elementos
          HTML (logo/título/descrição/benefícios/rodapé) por cima. Pra trocar a arte no futuro,
          basta substituir o arquivo — nenhuma linha de código muda.
          `temArteFundo` (checado em disco por page.tsx) só existe pra não renderizar a tag
          <Image> antes do arquivo existir — sem ela, o navegador mostra o ícone de "imagem
          quebrada" no canto. Sem o asset, cai no fallback bg-brand-navy (cor sólida, nunca uma
          composição tentando simular a arte). */}
      <div className="relative hidden shrink-0 overflow-hidden bg-brand-navy md:block md:w-[43%] lg:w-[48%]">
        {temArteFundo && (
          // unoptimized: sem isso, o Next re-comprime a imagem no próprio pipeline de otimização
          // (webp/avif, qualidade 75 por padrão) por cima do arquivo que o Samuel já forneceu —
          // foi exatamente essa recompressão dupla que deixou a arte borrada e com a cor
          // alterada. `unoptimized` serve o arquivo exatamente como está em public/images/,
          // byte a byte, sem nenhum reprocessamento.
          // object-position 35% (evoluiu de 25%, pedido do Samuel, 03/08/2026 — "mais um pouco
          // pra esquerda"): a arte concentra os elementos "cheios" (carro, ícone de escudo) do
          // lado direito — testei até 60% e a partir de ~45% o retrovisor/ícone do escudo já
          // cruzam por cima do texto dos benefícios; 35% é o ponto mais à direita que ainda fica
          // limpo. Ainda é só posicionamento, não redesenho.
          <Image
            src="/images/login-left.png"
            alt=""
            fill
            priority
            unoptimized
            className="object-cover"
            style={{ objectPosition: '50% center' }}
          />
        )}
        <div aria-hidden className="absolute inset-0 bg-black/25" />

        {/* Conteúdo colado no topo (não mais espalhado com justify-between) — deixa a metade de
            baixo do painel livre pra arte (o carro) respirar, em vez de competir com texto
            (pedido do Samuel, 03/08/2026: "o carro vira protagonista"). Rodapé simplificado,
            empurrado pro final via mt-auto. */}
        <div className="relative z-10 flex h-full flex-col p-12 text-white">
          <div className="animar-entrada flex items-center gap-3">
            <Image
              src="/Logo Protege Club.png"
              alt="ProtegeClub"
              width={80}
              height={80}
              priority
              className="h-20 w-20 shrink-0"
            />
            <span className="text-sm font-semibold tracking-wide">ProtegeClub</span>
          </div>

          <div
            className="animar-entrada mt-16 max-w-[470px] pl-3"
            style={{ animationDelay: "100ms" }}
          >
            <span
              className="mb-6 inline-block h-1 w-12 rounded-full bg-brand-orange"
              aria-hidden
            />

            <h1 className="text-[36px] font-bold leading-[1.05] tracking-[-0.03em] text-white lg:text-[56px]">
              <span className="whitespace-nowrap">
                Central de Apuração
              </span>

              <br />

              <span className="text-brand-orange">
                Comercial
              </span>
            </h1>

            <p className="mt-8 max-w-[390px] text-[17px] leading-8 text-white/70">
              Plataforma exclusiva para gestão de comissões, desempenho comercial e
              acompanhamento operacional.
            </p>

            <div className="animar-entrada mt-8 hidden grid-cols-2 gap-3 lg:grid" style={{ animationDelay: '200ms' }}>
              {CARDS.map((c) => (
                <div key={c.titulo} className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/15 text-brand-orange">
                    {c.icone}
                  </span>
                  <p className="mt-2.5 text-sm font-semibold text-white">{c.titulo}</p>
                  <p className="text-xs text-white/55">{c.descricao}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2 text-xs text-white/40">
            <IconeEscudo className="h-3.5 w-3.5 shrink-0" />
            Ambiente protegido
          </div>
        </div>
      </div>

      {/* Painel do formulário — fundo branco liso, sem elemento decorativo (pedido explícito do
          Samuel, 02/08/2026: "nenhum elemento decorativo" nesta coluna). */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-white px-4 py-10">
        <div className="animar-entrada w-full max-w-[520px] rounded-[28px] bg-white p-8 shadow-[0_35px_100px_-25px_rgba(0,42,84,0.32)] sm:p-12">
          <div className="mb-8 space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand-navy">
              <Image
                src="/Logo Protege Club.png"
                alt="ProtegeClub"
                width={40}
                height={40}
                priority
                className="h-10 w-10"
              />
            </div>
            {mostrarRecuperacao ? (
              <>
                <h2 className="text-4xl font-bold text-brand-navy">Redefinir senha</h2>
                <p className="text-base text-slate-500">
                  Informe seu e-mail de acesso e mandamos um link pra você definir uma senha nova.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold text-brand-navy">Bem-vindo de volta!</h2>
                <p className="text-base text-slate-500">
                  Faça login para acessar o painel de apuração de comissões.
                </p>
              </>
            )}
          </div>

          {mostrarRecuperacao ? (
            <form action={recuperacaoAction} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email-recuperacao" className="text-sm font-medium text-slate-700">
                  E-mail
                </label>
                <div className="relative">
                  <IconeEmail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    id="email-recuperacao"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@protegeclub.com.br"
                    required
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus-visible:border-brand-blue focus-visible:bg-white focus-visible:shadow-[0_0_0_4px_rgba(37,169,225,0.15)]"
                  />
                </div>
              </div>

              {estadoRecuperacao?.erro ? <Banner tom="erro">{estadoRecuperacao.erro}</Banner> : null}
              {estadoRecuperacao?.sucesso ? (
                <Banner tom="sucesso">
                  Se esse e-mail tiver uma conta no sistema, enviamos um link de redefinição — confira sua caixa de
                  entrada (e o spam).
                </Banner>
              ) : null}

              <button
                type="submit"
                disabled={pendenteRecuperacao}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-orange-hover hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {pendenteRecuperacao ? <IconeSpinner className="h-5 w-5" /> : <IconeEmail className="h-5 w-5" />}
                {pendenteRecuperacao ? 'Enviando…' : 'Enviar link de redefinição'}
              </button>

              <button
                type="button"
                onClick={() => setMostrarRecuperacao(false)}
                className="w-full text-center text-sm font-medium text-slate-500 hover:text-brand-navy"
              >
                ← Voltar para o login
              </button>
            </form>
          ) : (
            <form action={formAction} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  E-mail
                </label>
                <div className="relative">
                  <IconeEmail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@protegeclub.com.br"
                    required
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus-visible:border-brand-blue focus-visible:bg-white focus-visible:shadow-[0_0_0_4px_rgba(37,169,225,0.15)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Senha
                </label>
                <div className="relative">
                  <IconeCadeado className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus-visible:border-brand-blue focus-visible:bg-white focus-visible:shadow-[0_0_0_4px_rgba(37,169,225,0.15)]"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {mostrarSenha ? <IconeOlhoFechado className="h-[18px] w-[18px]" /> : <IconeOlho className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                    {/* Supabase já persiste a sessão por padrão (localStorage) independente deste
                        checkbox — não existe hoje um modo "sessão curta" pra alternar. O `name`
                        só garante que o campo seja um controle de formulário real (antes não
                        tinha, então nunca era enviado com o submit). */}
                    <input
                      type="checkbox"
                      name="manter_conectado"
                      className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <span className="pointer-events-none absolute inset-0 rounded-[6px] border border-slate-300 bg-white transition-colors peer-checked:border-brand-orange peer-checked:bg-brand-orange peer-focus-visible:ring-2 peer-focus-visible:ring-brand-blue/30 peer-focus-visible:ring-offset-1" />
                    <IconeCheck className="pointer-events-none relative h-2.5 w-2.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                  </span>
                  Manter conectado
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarRecuperacao(true)}
                  className="text-left text-sm font-medium text-brand-blue hover:text-brand-navy sm:text-right"
                >
                  Esqueceu sua senha?
                </button>
              </div>

              {estado?.erro ? <Banner tom="erro">{estado.erro}</Banner> : null}

              <button
                type="submit"
                disabled={pendente}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-orange-hover hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {pendente ? <IconeSpinner className="h-5 w-5" /> : <IconeEntrar className="h-5 w-5" />}
                {pendente ? 'Entrando…' : 'Entrar'}
              </button>

              <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-xs text-slate-400">
                <IconeCadeado className="h-3.5 w-3.5" />
                Sistema protegido
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
