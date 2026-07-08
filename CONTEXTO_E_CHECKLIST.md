# Protege Club — Sistema de Apuração de Comissões

> **Se você é uma IA (ou dev) assumindo este projeto agora**: leia este arquivo primeiro, do
> início ao fim. Ele resume o negócio, o que já foi decidido, onde estão os detalhes, e traz um
> checklist do que falta construir. Os documentos linkados na seção 3 têm o detalhe completo —
> este arquivo é o mapa, não o território.

## 1. O que é este projeto

A **Protege Club** (associação de proteção veicular em Rio Verde, GO — carros e motos,
[protegeclub.com.br](https://protegeclub.com.br/)) vende através de uma rede de ~245 consultores
externos. Hoje o fechamento mensal da comissão desses consultores é feito manualmente (Excel + um
Power BI limitado), cruzando dados de dois sistemas que a associação já usa:

- **Ileva** — gestão da associação (associados, veículos, boletos, vínculo consultor↔placa).
- **Omie** — financeiro (contas a pagar/receber). O título a pagar de cada consultor é lançado
  manualmente, um por um.

O sistema que estamos construindo **substitui essa apuração manual**: consome as duas APIs,
calcula a comissão de cada consultor automaticamente, mostra isso em telas por perfil de acesso e
gera os relatórios em PDF que hoje são feitos na mão.

Quem contratou o desenvolvimento é a própria Protege Club; quem está construindo é o Samuel
(usuário deste projeto), em parceria com uma IA (inicialmente Claude).

## 2. Modelo de comissão do consultor (o coração do sistema)

Todo consultor tem três fontes de ganho, apuradas mensalmente:

1. **Adesão** — taxa cobrada na venda inicial, fica 100% com o consultor (~99% retêm direto do
   associado; ~1% manda pra associação, que repassa depois — caso especial, ainda sem tratamento
   definido).
2. **Recorrência ("Assistência Profissional")** — embutida na mensalidade, só é devida depois que
   o boleto do associado é pago. No Ileva, isso é o benefício `cod_beneficio 65` (existem
   variantes 66/110/121). Confirmado com dados reais.
3. **Plano de carreira** — bonificação por volume de veículos vendidos no mês, com níveis e
   bonificação de equipe. **As regras exatas ainda não foram definidas pelo cliente** — é o maior
   bloqueio para o motor de cálculo completo.

**Dedução**: veículos acima de R$80mil recebem rastreador; o custo de instalação (R$100) é
descontado do consultor. O corte de R$80mil já vem embutido no nome do plano no Ileva (ex.:
"...Acima de 80 Mil"). **Onde exatamente o custo de R$100 é lançado no Ileva ainda não foi
identificado** — outro ponto a confirmar com o cliente.

## 3. Documentos do projeto (onde está cada detalhe)

| Arquivo | Conteúdo |
|---|---|
| `docs/REQUISITOS.md` | Requisitos completos extraídos da reunião com o cliente + site + pesquisa. Perfis de acesso, funcionalidades, riscos, perguntas abertas. |
| `docs/api-ileva/ENDPOINTS.md` | Endpoints reais da API do Ileva (confirmados contra a base de produção), com o fluxo de apuração recomendado passo a passo. |
| `docs/api-ileva/COMO_GERAR_CHAVE_API.md` | Passo a passo para gerar a API key só-leitura no Ileva e no Omie. |
| `docs/api-ileva/specs/*.json` | Specs OpenAPI brutas de cada módulo do Ileva (fonte primária, caso o resumo em ENDPOINTS.md fique defasado). |
| `docs/PROPOSTA_COMERCIAL.md` + `docs/Proposta Comercial - Protege Club.pdf` | Proposta enviada ao cliente: R$ 2.000 desenvolvimento + R$ 300/mês manutenção, prazo de 10 a 15 dias. |
| `docs/transcricoes/` | Transcrição bruta dos vídeos da reunião com o cliente e do tutorial de configuração da API Ileva. |
| `.env` / `.env.example` | Credenciais (não versionado) e template das variáveis necessárias. |
| `web/` | Código do sistema (Next.js 16 + Supabase). `web/.env.local` é a cópia usada em runtime pelo app (também não versionada). |
| `web/supabase/migrations/0001_init.sql` | Schema inicial do banco (perfis, apurações, auditoria Omie, cache de token Ileva) — ainda não aplicado a um projeto real. |

## 4. Decisões técnicas já tomadas

- **Hospedagem**: Vercel (front-end/back-end), com possibilidade futura de migrar para VPS se o
  projeto crescer.
- **Banco de dados**: Supabase (ainda não criado — variáveis já reservadas no `.env`).
- **Fonte de verdade dos dados operacionais**: Ileva (vínculo consultor↔veículo, recorrência,
  adesão). A Omie é usada como destino financeiro (criação do título a pagar), não como fonte de
  verdade do vínculo consultor↔título (lá esse vínculo é manual e não confiável).
- **Autenticação Ileva**: `POST /oauth/token`, header `app_key`, body `username`/`password`, token
  Bearer válido 24h, único por usuário (novo login invalida o anterior).
- **Omie**: ainda sem chave de teste obtida — usar o "Novo teste grátis" em Meus Aplicativos antes
  de tocar na conta real.
- **Next.js 16**: `middleware.ts` foi renomeado para **`proxy.ts`** nessa versão (breaking
  change — não confundir com convenções de versões anteriores). Ver
  `web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` se
  precisar confirmar algo da API. O `web/AGENTS.md` também avisa sobre isso — vale reler antes de
  qualquer mudança estrutural no Next.js.
- **Estrutura de pastas**: um único repositório git na raiz do projeto (`docs/`, arquivos de
  contexto e `web/` — o código — convivem no mesmo repo). Não criar um `.git` dentro de `web/`.
- **RBAC**: aplicado em duas camadas — `web/src/proxy.ts` (redireciona por perfil) e RLS no
  Supabase (`web/supabase/migrations/0001_init.sql`). Nenhuma delas sozinha é suficiente; o Next
  avisa explicitamente que rotas podem mudar sem passar pelo proxy, então toda Server
  Action/Route Handler sensível deve reconferir o perfil.

## 5. Status atual

- ✅ Requisitos extraídos e documentados.
- ✅ API do Ileva mapeada e validada com dados reais (usuário de API só-leitura).
- ✅ Proposta comercial enviada ao cliente (06/07/2026).
- ✅ **Serviço aprovado pelo cliente**, seguindo a proposta original (R$ 2.000 + R$ 300/mês, sem
  alteração de escopo).
- ℹ️ Recebemos uma "v2" (`docs/proposta-mvp-expandido-protege-club-2026-07-06.pdf`) enviada pela
  **concorrência** ao cliente, propondo +R$600 por uma feature (Conta a Pagar automática no Omie)
  que já estava no nosso escopo original. Decisão: **seguir com a proposta original**, sem
  adotar o v2. Vale manter em mente que existe concorrência ativa disputando este cliente.
  A ideia de auditoria/log de geração de título (do v2) é boa prática e pode ser incorporada de
  qualquer forma, sem custo adicional, quando chegarmos na integração com a Omie (seção 6.5).
- ⏳ Chave de teste da Omie ainda não obtida.
- ⏳ Regras do plano de carreira ainda não detalhadas pelo cliente.
- ✅ **Scaffold inicial do sistema criado** (07/07/2026): Next.js 16 em `web/`, rotas por perfil,
  cliente de API do Ileva, esqueleto do cliente Omie, migrations do Supabase, RBAC via
  `proxy.ts`. Build e lint passando. Primeiro commit git feito na raiz do projeto.
- ⏳ **Bloqueios para o próximo passo real**: precisa (1) criar o projeto Supabase e colar as
  credenciais em `web/.env.local`, (2) criar o repositório no GitHub (sem `gh` CLI autenticada
  aqui — fazer manualmente ou autenticar o CLI), (3) autenticar Vercel para o primeiro deploy.

## 6. Checklist do sistema

> Marcar `[x]` conforme for concluído. Manter este checklist atualizado é mais importante do que
> deixá-lo bonito — é a forma mais rápida de qualquer IA/dev entender o que falta.

### 6.1 Descoberta e alinhamento
- [x] Transcrever e extrair requisitos da reunião com o cliente
- [x] Mapear e validar a API real do Ileva
- [x] Montar e enviar proposta comercial
- [x] Aprovação da proposta pelo cliente
- [ ] Obter chave de teste da Omie e mapear os endpoints dela
- [ ] Regras completas do plano de carreira (níveis, faixas, bonificação de equipe) definidas
- [ ] Confirmar onde o custo de instalação do rastreador (R$100) é lançado no Ileva

### 6.2 Setup do projeto
- [ ] Repositório criado no **GitHub** (só existe local por enquanto — sem `gh`/`vercel` CLI
      autenticados neste ambiente; criar o repo e rodar `git remote add` + `git push` manualmente)
- [x] Projeto Next.js iniciado em `web/` (Next 16, TypeScript, Tailwind, App Router) — build e
      lint passando
- [ ] Projeto Supabase criado e variáveis preenchidas em `web/.env.local` (migrations já escritas
      em `web/supabase/migrations/0001_init.sql`, prontas para aplicar quando o projeto existir)
- [ ] Deploy inicial publicado no Vercel (sem CLI autenticada neste ambiente — fazer via
      dashboard ou `vercel login` manual)
- [x] `.gitignore` revisado (raiz + `web/`, cobrindo `.env*`, `node_modules/`, `.next/`, `*.mp4`)

### 6.3 Autenticação e controle de acesso
- [ ] Login (Supabase Auth) — página e Server Action já escritos
      (`web/src/app/login/`), falta o projeto Supabase para testar de ponta a ponta
- [ ] Perfil **Gestor** (acesso total) — rota `/gestor` escrita, dados reais pendentes
- [ ] Perfil **Comercial** (consultores + apuração, sem financeiro) — rota `/comercial` escrita
- [ ] Perfil **Consultor** (só os próprios dados) — rota `/consultor` escrita
- [x] RBAC entre perfis via `web/src/proxy.ts` (bloqueia perfil acessando rota de outro) — testado
      no build, falta testar com sessão real
- [ ] Regras de acesso no banco (RLS) — policies já na migration `0001_init.sql`, falta aplicar e
      testar contra o projeto Supabase real

### 6.4 Integração com Ileva
- [x] Autenticação validada (`/oauth/token`) — cliente em `web/src/lib/ileva/client.ts`, com
      cache de token em memória (⚠️ ver nota no código: precisa virar cache compartilhado —
      tabela `ileva_token_cache` já criada na migration — antes de rodar em produção serverless)
- [x] Funções de leitura escritas (`web/src/lib/ileva/api.ts`): consultores, veículos, boletos,
      benefícios — ainda não usadas em nenhuma tela real
- [ ] Sincronização de fato (rotina que popula o Supabase a partir da API do Ileva)
- [ ] Identificar em produção qual variante de "Assistência Profissional" cada plano/regional usa
      (65 / 66 / 110 / 121)
- [ ] Rotina periódica de atualização (cron/job) em vez de consultar a API a cada acesso de tela

### 6.5 Integração com Omie
- [ ] Chave de teste (sandbox) obtida
- [ ] Autenticação validada
- [x] Esqueleto do cliente escrito (`web/src/lib/omie/client.ts`, convenção de `call` da API da
      Omie) — sem credenciais ainda, não testado
- [ ] Criação automática do título a pagar por consultor (`IncluirContaPagar` — confirmar
      método/payload exato quando tivermos a chave de teste)
- [ ] Código interno de integração por lançamento, para evitar duplicidade ao reprocessar
- [ ] Log de auditoria: quem gerou, quando, valor, consultor, contrato, retorno do Omie
- [ ] Rotina de validação: alertar títulos sem consultor vinculado antes do fechamento
- [ ] Troca das credenciais de teste pelas de produção (só após validação completa)

### 6.6 Motor de apuração de comissão
- [ ] Cálculo da adesão (com tratamento do caso dos ~1% que não retêm direto)
- [ ] Cálculo da recorrência (Assistência Profissional), condicionado a boleto `Liquidado`
- [ ] Dedução da instalação do rastreador
- [ ] Cálculo do plano de carreira (bloqueado até o cliente definir as regras)
- [ ] Fechamento mensal consolidado por consultor

### 6.7 Telas
- [ ] Painel do Consultor: adesões, recorrência, desconto de rastreador, premiação,
      inadimplentes, com drill-down por card
- [ ] Painel Comercial: gerar e conferir a apuração mensal de todos os consultores
- [ ] Painel Gestor: tudo do Comercial + visão financeira consolidada

### 6.8 Relatórios
- [ ] PDF individual por consultor (resumo + lista de placas)
- [ ] PDF de totalização geral do mês

### 6.9 Testes e validação
- [ ] Testes com dados reais via API de teste (sem afetar produção)
- [ ] Validação prática com o cliente (comparar com o fechamento manual de um mês já apurado)
- [ ] Ajustes finais de acordo com o feedback

### 6.10 Entrega e manutenção
- [ ] Deploy em produção
- [ ] Repasse rápido de uso para Gestor/Comercial
- [ ] Início do contrato de manutenção mensal (R$ 300/mês)
