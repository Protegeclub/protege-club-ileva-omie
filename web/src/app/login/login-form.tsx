'use client'

import Image from 'next/image'
import { useActionState, useState } from 'react'
import { Banner } from '@/lib/ui/banner'
import { IconeApurado, IconeAtualizar } from '@/lib/ui/icones-sidebar'
import { IconeSpinner } from '../gestor/gerar/icones'
import { entrar } from './actions'
import {
  IconeCadeado,
  IconeEmail,
  IconeEntrar,
  IconeEscudo,
  IconeGraficoBarras,
  IconeOlho,
  IconeOlhoFechado,
} from './icones'

const estadoInicial = { erro: '' }

const BENEFICIOS = [
  {
    icone: <IconeAtualizar className="h-4 w-4" />,
    titulo: 'Sincronização automática',
    descricao: 'Integração em tempo real com a API da Ileva.',
  },
  {
    icone: <IconeEscudo className="h-4 w-4" />,
    titulo: 'Dados protegidos',
    descricao: 'Segurança e criptografia para todas as informações.',
  },
  {
    icone: <IconeGraficoBarras className="h-4 w-4" />,
    titulo: 'Dashboard executivo',
    descricao: 'Indicadores financeiros e comerciais em tempo real.',
  },
  {
    icone: <IconeApurado className="h-4 w-4" />,
    titulo: 'Histórico completo',
    descricao: 'Acompanhe todas as apurações já realizadas.',
  },
]

const CORES_AMBIENTE: Record<string, string> = {
  Produção: 'bg-emerald-50 text-emerald-700',
  Homologação: 'bg-amber-50 text-amber-700',
  Desenvolvimento: 'bg-slate-100 text-slate-500',
}

export function LoginForm({ versao, ambiente }: { versao: string; ambiente: string }) {
  const [estado, formAction, pendente] = useActionState(entrar, estadoInicial)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  return (
    <main className="flex min-h-screen bg-white">
      {/* Painel institucional — some no mobile (só logo+login+botão lá), reduzido em telas
          médias (só logo+headline, sem benefícios/mockup) e completo em telas grandes. */}
      <div className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-hover px-10 py-8 text-white md:flex md:w-2/5 lg:w-[45%] lg:px-14 lg:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-brand-orange/10 blur-[2px]" />
        <IconeEscudo className="pointer-events-none absolute -right-6 top-[28%] hidden h-64 w-64 text-white/[0.04] lg:block" />
        <svg
          aria-hidden
          viewBox="0 0 300 150"
          fill="none"
          className="pointer-events-none absolute bottom-16 left-0 hidden h-40 w-72 text-brand-blue/10 lg:block"
        >
          <path d="M-10 100C60 40 140 160 220 60S340 20 400 80" stroke="currentColor" strokeWidth="3" />
        </svg>

        <div className="animar-entrada relative z-10 flex items-center gap-3">
          <Image
            src="/Logo Protege Club.png"
            alt="Protege Club"
            width={40}
            height={40}
            priority
            className="h-10 w-10 shrink-0"
          />
          <span className="text-sm font-semibold tracking-wide">Protege Club</span>
        </div>

        <div className="relative z-10 space-y-4 pl-3">
          <div className="animar-entrada max-w-md" style={{ animationDelay: '100ms' }}>
            <span className="mb-3 inline-block h-1 w-10 rounded-full bg-brand-orange" aria-hidden />
            <h1 className="text-[32px] font-bold leading-[1.15] lg:text-[42px]">
              Apuração de comissões,
              <br />
              <span className="text-brand-orange">do jeito certo.</span>
            </h1>
            <p className="mt-3 text-sm text-white/60 lg:text-base">
              Sincronização automática com a API da Ileva, cálculo de adesão, recorrência,
              descontos, equipes e todo o histórico em uma única plataforma.
            </p>
          </div>

          <div className="animar-entrada hidden grid-cols-1 gap-2.5 lg:grid" style={{ animationDelay: '200ms' }}>
            {BENEFICIOS.map((b) => (
              <div key={b.titulo} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-orange">
                  {b.icone}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{b.titulo}</p>
                  <p className="text-xs text-white/55">{b.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <IconeEscudo className="h-3.5 w-3.5" />
            Segurança em primeiro lugar
          </div>
          <p className="text-xs text-white/30">© {new Date().getFullYear()} Protege Club</p>
        </div>
      </div>

      {/* Painel do formulário */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-50 to-white px-4 py-10">
        <div className="animar-entrada w-full max-w-[500px] rounded-[24px] bg-white p-8 shadow-[0_20px_60px_-15px_rgba(0,42,84,0.18)] sm:p-12">
          <div className="mb-8 space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy">
              <Image
                src="/Logo Protege Club.png"
                alt="Protege Club"
                width={40}
                height={40}
                priority
                className="h-10 w-10"
              />
            </div>
            <h2 className="text-2xl font-bold text-brand-navy">Bem-vindo de volta!</h2>
            <p className="text-base text-slate-500">
              Faça login para acessar o painel de apuração de comissões.
            </p>
          </div>

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
                  className="h-14 w-full rounded-[14px] border border-slate-300 pl-11 pr-4 text-base outline-none transition-colors focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
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
                  className="h-14 w-full rounded-[14px] border border-slate-300 pl-11 pr-11 text-base outline-none transition-colors focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
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
              <label className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-orange" />
                Manter conectado
              </label>
              {/* Sem fluxo de recuperação de senha implementado ainda — texto informativo, não
                  um link que finge funcionar. */}
              <span
                title="Fale com o administrador do sistema para redefinir sua senha."
                className="cursor-default text-sm text-slate-400"
              >
                Esqueceu sua senha?
              </span>
            </div>

            {estado?.erro ? <Banner tom="erro">{estado.erro}</Banner> : null}

            <button
              type="submit"
              disabled={pendente}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-brand-orange text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-orange-hover hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {pendente ? <IconeSpinner className="h-5 w-5" /> : <IconeEntrar className="h-5 w-5" />}
              {pendente ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-xs text-slate-400">
              <IconeCadeado className="h-3.5 w-3.5" />
              Sistema protegido
            </div>
          </form>
        </div>

        <div
          className="animar-entrada flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-slate-400"
          style={{ animationDelay: '100ms' }}
        >
          <span>Versão {versao}</span>
          <span className={`rounded-full px-2.5 py-0.5 font-medium ${CORES_AMBIENTE[ambiente] ?? 'bg-slate-100 text-slate-500'}`}>
            Ambiente: {ambiente}
          </span>
        </div>
      </div>
    </main>
  )
}
