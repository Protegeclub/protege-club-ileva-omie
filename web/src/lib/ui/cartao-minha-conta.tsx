'use client'

import { useActionState, useState } from 'react'
import {
  atualizarNomeProprioAction,
  trocarSenhaProprioAction,
  type AtualizarNomeEstado,
  type TrocarSenhaEstado,
} from '@/lib/auth/conta-actions'
import { Banner } from './banner'
import { Botao } from './botao'
import { Cartao, CartaoCabecalho } from './cartao'
import { IconeCadeado, IconeUsuario } from './icones-sidebar'

const ESTADO_NOME_INICIAL: AtualizarNomeEstado = {}
const ESTADO_SENHA_INICIAL: TrocarSenhaEstado = {}

const RETULO_PERFIL: Record<string, string> = {
  gestor: 'Gestor',
  comercial: 'Comercial',
  consultor: 'Consultor',
}

// Compartilhado entre /gestor/configuracoes e /consultor/configuracoes — self-service sobre a
// própria conta não tem nenhuma diferença de regra entre os perfis, então não faz sentido
// duplicar (diferente das telas de dado de negócio, que são deliberadamente espelhadas).
export function CartaoMinhaConta({
  nomeAtual,
  email,
  perfil,
}: {
  nomeAtual: string
  email: string
  perfil: string
}) {
  const [estadoNome, formActionNome, pendenteNome] = useActionState(atualizarNomeProprioAction, ESTADO_NOME_INICIAL)
  const [estadoSenha, formActionSenha, pendenteSenha] = useActionState(trocarSenhaProprioAction, ESTADO_SENHA_INICIAL)
  const [mostrarSenhas, setMostrarSenhas] = useState(false)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Cartao className="p-5">
        <CartaoCabecalho icone={<IconeUsuario className="h-5 w-5" />} titulo="Minha conta" descricao="Nome exibido no menu e nos relatórios" />
        <form action={formActionNome} className="mt-4 space-y-3">
          <div>
            <label htmlFor="nome" className="block text-xs font-medium text-slate-500">Nome</label>
            <input
              key={nomeAtual}
              id="nome"
              name="nome"
              type="text"
              defaultValue={nomeAtual}
              required
              maxLength={100}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">E-mail</label>
            <p className="mt-1.5 h-10 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm leading-10 text-slate-500">
              {email}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Perfil de acesso</label>
            <p className="mt-1.5 text-sm text-slate-700">{RETULO_PERFIL[perfil] ?? perfil}</p>
          </div>

          {estadoNome.erro ? <Banner tom="erro">{estadoNome.erro}</Banner> : null}
          {estadoNome.ok ? <Banner tom="sucesso">Nome atualizado.</Banner> : null}

          <Botao type="submit" variante="secundaria" tamanho="sm" disabled={pendenteNome}>
            {pendenteNome ? 'Salvando…' : 'Salvar nome'}
          </Botao>
        </form>
      </Cartao>

      <Cartao className="p-5">
        <CartaoCabecalho icone={<IconeCadeado className="h-5 w-5" />} titulo="Segurança" descricao="Trocar a senha de acesso" />
        <form action={formActionSenha} className="mt-4 space-y-3" key={estadoSenha.ok ? 'limpo' : 'form'}>
          <div>
            <label htmlFor="senha_atual" className="block text-xs font-medium text-slate-500">Senha atual</label>
            <input
              id="senha_atual"
              name="senha_atual"
              type={mostrarSenhas ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
          </div>
          <div>
            <label htmlFor="senha_nova" className="block text-xs font-medium text-slate-500">Nova senha</label>
            <input
              id="senha_nova"
              name="senha_nova"
              type={mostrarSenhas ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={6}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
          </div>
          <div>
            <label htmlFor="senha_confirmacao" className="block text-xs font-medium text-slate-500">Confirmar nova senha</label>
            <input
              id="senha_confirmacao"
              name="senha_confirmacao"
              type={mostrarSenhas ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={6}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-blue"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={mostrarSenhas}
              onChange={(e) => setMostrarSenhas(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-navy"
            />
            Mostrar senhas
          </label>

          {estadoSenha.erro ? <Banner tom="erro">{estadoSenha.erro}</Banner> : null}
          {estadoSenha.ok ? <Banner tom="sucesso">Senha alterada com sucesso.</Banner> : null}

          <Botao type="submit" variante="secundaria" tamanho="sm" disabled={pendenteSenha}>
            {pendenteSenha ? 'Salvando…' : 'Trocar senha'}
          </Botao>
        </form>
      </Cartao>
    </div>
  )
}
