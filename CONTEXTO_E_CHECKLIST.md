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
"...Acima de 80 Mil"). ~~Onde exatamente o custo de R$100 é lançado no Ileva ainda não foi
identificado~~ — **resolvido em 11/07/2026**: não é um lançamento específico no Ileva, é uma
regra do nosso sistema — R$100 fixo por veículo com `possui_rastreador = Sim` cujo `dt_contrato`
cai no mês apurado (confirmado batendo com os totais reais do Power BI que o cliente usa hoje,
ver pasta `Telas Cosultores/`).

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
| `web/supabase/migrations/` | Schema do banco (perfis, apurações, auditoria Omie, cache de token Ileva, `cod_equipe`). |
| `Telas Cosultores/` | Prints do Power BI atual (Adesões, Recorrência, Desconto de Rastreadores, Inadimplentes) — referência exata das colunas/layout que o painel do Consultor precisa reproduzir. |

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
- **Apuração é gerada sob demanda, não calculada ao vivo**: um consultor real chegou a ter 871
  veículos — calcular tudo a cada carregamento de tela não escala. O painel Comercial roda o
  cálculo (`web/src/lib/apuracao/mensal.ts`) e salva o resultado em `apuracoes_mensais`; o painel
  do Consultor só lê o que já foi salvo. Gerar de novo sobrescreve o mês (upsert por
  `cod_consultor + ano + mes`).
- **Scripts de dev** (`web/scripts/`): `run-migration.mjs` (aplica SQL direto no Postgres, sem
  precisar do SQL Editor) e `test-apuracao.mts` (testa o motor de apuração sem subir o Next.js).
  As dependências que eles usam (`pg`, `tsx`) são instaladas sob demanda
  (`npm install --no-save pg` / `tsx`) e **não ficam no `package.json`** — isso é proposital,
  para o `npm install` do Vercel não tentar baixar coisas desnecessárias no build de produção.

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
- ✅ **Primeiras telas funcionais e validadas com dados reais** (11/07/2026): painel Comercial
  gera a apuração (adesão + recorrência) de um consultor via API real do Ileva e salva no
  Supabase; painel do Consultor lê e mostra isso com drill-down. Testado de ponta a ponta em
  navegador headless com o consultor real `313` (adesão R$ 200 em maio, recorrência R$ 23 em
  julho e R$ 57,15 em junho/2026 — todos conferidos manualmente antes de confiar no resultado).
- ✅ **Primeiro deploy em produção na Vercel** (11/07/2026):
  `protege-club-ileva-omie.vercel.app`. Testado de ponta a ponta em produção (não só local) —
  login dos dois usuários de teste, painel do Consultor com dados reais, e a geração de
  apuração pelo Comercial batendo na API do Ileva a partir do servidor da Vercel (~2,8s para um
  consultor pequeno). Variáveis de ambiente confirmadas corretas em produção.
- ⏳ **Próximos focos**: painel do Gestor (ainda placeholder), geração em lote de todos os
  consultores, decidir onde entra o desconto de rastreador, e a Omie (assim que tivermos a
  chave de teste).
- ⏳ Chave de teste da Omie ainda não obtida.
- ⏳ Regras do plano de carreira ainda não detalhadas pelo cliente.
- ✅ **Scaffold inicial do sistema criado** (07/07/2026): Next.js 16 em `web/`, rotas por perfil,
  cliente de API do Ileva, esqueleto do cliente Omie, migrations do Supabase, RBAC via
  `proxy.ts`. Build e lint passando. Primeiro commit git feito na raiz do projeto.
- ✅ Repositório no GitHub criado (conta do cliente, `Protegeclub/protege-club-ileva-omie`) e
  primeiro push feito em 11/07/2026.
- ✅ Projeto Supabase criado e migration inicial aplicada (11/07/2026) — tabelas confirmadas.
- ✅ Primeiro usuário criado no Supabase Auth (`marketing@artha.srv.br`) e vinculado como
  **Gestor** na tabela `perfis`. Fluxo de proxy/RBAC testado localmente (`/` sem sessão →
  redireciona pra `/login`; `/gestor` sem sessão → redireciona pra `/login`) — confirmado
  funcionando em 11/07/2026. Falta testar o login de fato (com sessão autenticada).
- ✅ Vercel conectado ao repositório do GitHub (a importar assim que houver alguma tela real para
  publicar).
- ⏳ **Bloqueio restante**: nenhum bloqueio de infraestrutura — dá pra seguir direto para as
  telas reais (seção 6.7) e a sincronização com o Ileva (seção 6.4).

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
- [x] Repositório criado no **GitHub**: `Protegeclub/protege-club-ileva-omie` (conta do cliente),
      remote `origin` configurado e branch `main` publicada
- [x] Projeto Next.js iniciado em `web/` (Next 16, TypeScript, Tailwind, App Router) — build e
      lint passando
- [x] Projeto Supabase criado, variáveis preenchidas em `.env` e `web/.env.local`, e migration
      `0001_init.sql` aplicada com sucesso (tabelas `perfis`, `apuracoes_mensais`,
      `auditoria_omie`, `plano_carreira_niveis`, `ileva_token_cache` confirmadas em 11/07/2026)
- [x] Deploy em produção na Vercel: `protege-club-ileva-omie.vercel.app` — testado de ponta a
      ponta (login, painel do Consultor, geração de apuração pelo Comercial) direto em produção
- [x] `.gitignore` revisado (raiz + `web/`, cobrindo `.env*`, `node_modules/`, `.next/`, `*.mp4`)

### 6.3 Autenticação e controle de acesso
- [ ] Login (Supabase Auth) — página e Server Action escritos, redirecionamentos testados; falta
      testar o login em si com sessão real (precisa da senha do usuário de teste, que só o
      Samuel tem)
- [x] Usuário Gestor de teste criado (`marketing@artha.srv.br`) e vinculado em `perfis`
- [x] Usuário Consultor de teste criado (`consultor-teste@protegeclub.local`, vinculado ao
      `cod_consultor 313` real do Ileva)
- [ ] Perfil **Gestor** (acesso total) — rota `/gestor` escrita, dados reais pendentes
- [x] Perfil **Comercial** (gerar apuração) — funcional: formulário real, testado de ponta a
      ponta via navegador headless (login → gerar → salvar no Supabase)
- [x] Perfil **Consultor** (só os próprios dados) — funcional: lê a apuração gerada e mostra os
      cards com drill-down, testado com dados reais (maio e julho/2026 do consultor 313)
- [x] RBAC entre perfis via `web/src/proxy.ts` — testado localmente contra o Supabase real
      (redireciona corretamente sem sessão)
- [x] Regras de acesso no banco (RLS) — policies aplicadas via `0001_init.sql`; falta testar com
      um usuário/perfil real (nenhum usuário criado no Supabase Auth ainda)
- [x] **Bug real encontrado e corrigido no proxy.ts**: rotas `/api/*` estavam sendo redirecionadas
      pela checagem de perfil por prefixo (pensada pra páginas `/gestor`, `/comercial`,
      `/consultor`, não pra endpoints) — um Consultor batendo em `/api/relatorios/consultor`
      caía de volta no `/consultor` antes da rota rodar. `/api/*` agora passa direto (cada Route
      Handler já reconfirma o perfil sozinho).
- [x] **Convite de acesso para os 206 consultores reais**: `/gestor/acessos` lista quem já tem
      acesso (linha em `perfis`) e quem não tem, com botão "Convidar" por linha —
      `supabase.auth.admin.inviteUserByEmail` cria o usuário (e-mail já cadastrado no Ileva) e
      manda um link pra o próprio consultor definir a senha em `/definir-senha`; ninguém, nem o
      Gestor, fica sabendo senha de ninguém. **Não testei o envio de e-mail de verdade ainda**
      (evitar mandar convite pra consultor real sem avisar — decisão do Samuel). Cogitamos
      alternativa "senha = últimos 5 dígitos do CPF" (é assim que o sistema anterior faz), mas o
      Ileva não devolve CPF nos endpoints de consultor que temos acesso — fica bloqueado até
      surgir uma fonte pro CPF.

### 6.4 Integração com Ileva
- [x] Autenticação validada (`/oauth/token`) — cliente em `web/src/lib/ileva/client.ts`, com
      cache de token em memória (⚠️ ver nota no código: precisa virar cache compartilhado —
      tabela `ileva_token_cache` já criada na migration — antes de rodar em produção serverless)
- [x] **Bug real encontrado e corrigido**: como o token do Ileva é único por usuário, rodar um
      script de teste em paralelo (ex.: `test-apuracao.mts`) invalidava o token que o servidor
      dev estava usando, e a próxima chamada quebrava com 401 sem tentar de novo. `ilevaGet`
      agora refaz login e tenta a chamada mais uma vez antes de desistir.
- [x] Funções de leitura escritas e em uso real (`web/src/lib/ileva/api.ts`): consultores,
      veículos, boletos, benefícios
- [x] Motor de apuração (`web/src/lib/apuracao/mensal.ts`): calcula adesão e recorrência de um
      consultor num mês direto na API, com paginação (`inicio_paginacao` é obrigatório — a API
      dá erro 400 sem isso) e concorrência limitada (5 por vez, para não sobrecarregar)
- [ ] **Achado importante**: consultores variam MUITO em quantidade de veículos (de 0 a **871**
      num caso real) — calcular ao vivo a cada acesso de tela não escala para os grandes. Por
      isso a apuração é **gerada sob demanda** (painel Comercial) e salva em
      `apuracoes_mensais`, não recalculada a cada carregamento do painel do Consultor. Ainda
      falta: rodar para os consultores "grandes" de verdade e confirmar o tempo/timeout no
      Vercel (pode precisar virar um job em background em vez de Server Action síncrona).
- [x] Listagem de todos os consultores (`listarTodosConsultores` em `web/src/lib/ileva/api.ts`)
      — usada no painel do Gestor; rápida (~245 consultores, 1-2 páginas, nada a ver com o
      problema de escala por veículo acima)
- [ ] Geração em lote (todos os consultores de uma vez) — hoje só gera um `cod_consultor` por vez
- [ ] Identificar em produção qual variante de "Assistência Profissional" cada plano/regional usa
      (65 confirmado funcionando; 66/110/121 ainda não vistos em dado real)
- [ ] Rotina periódica de atualização (cron/job) em vez de gerar manualmente pelo Comercial

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
- [x] Cálculo da adesão — validado com dado real (consultor 313, maio/2026: R$ 200,00)
- [ ] Tratamento do caso dos ~1% de consultores que não retêm a adesão direto (ainda não
      diferenciado — hoje todo boleto `tipo_boleto: "Adesão"` conta igual)
- [x] Cálculo da recorrência (Assistência Profissional), condicionado a boleto `Liquidado` —
      validado com dado real (consultor 313: R$ 23,00 em julho, R$ 57,15 em junho/2026)
- [x] **Dedução da instalação do rastreador — resolvido**: R$100 fixo por veículo com
      `possui_rastreador = Sim` cujo `dt_contrato` cai no mês apurado. Validado com dado real
      (consultor 313, maio/2026: R$100,00 batendo com o Power BI atual).
- [x] **Inadimplentes**: boletos `Aberto` vencidos da carteira do consultor, com telefone do
      associado e valor estimado de recorrência a receber se pagar. É "estado atual" (usa a
      apuração mais recente já gerada, não filtra por mês/ano — igual ao Power BI de origem).
- [x] **Total Equipe**: soma as adesões dos colegas da mesma equipe (`cod_equipe`) que também já
      tiveram apuração gerada no mesmo mês — quem não gerou ainda não entra na conta.
- [ ] Cálculo do plano de carreira / premiação (bloqueado até o cliente definir as regras) —
      confirmamos com um exemplo real do Power BI (19 adesões → R$1.150 premiação individual)
      que existe uma fórmula, só falta o cliente detalhar as faixas.
- [x] Fechamento mensal consolidado por consultor — gravado em `apuracoes_mensais`, com upsert
      por `(cod_consultor, ano, mes)` (gerar de novo sobrescreve o mês)

### 6.7 Telas
- [x] **Painel do Consultor reestruturado igual ao Power BI atual** (11/07/2026, baseado nos
      prints da pasta `Telas Cosultores/`): sidebar com ano/mês/toggle de equipe/sair
      compartilhada entre 5 telas, dashboard com "Total a receber" + 4 botões de navegação +
      cards, e as 4 telas de detalhe (adesões, recorrência, rastreadores, inadimplentes) com as
      mesmas colunas do sistema de origem. Só premiação (individual/líder de equipe) continua
      como placeholder — bloqueado pelas regras do plano de carreira.
- [x] Painel Comercial: formulário funcional para gerar a apuração de um consultor por vez (por
      `cod_consultor` + mês/ano) — falta a versão "gerar todos de uma vez" e uma tela de
      conferência antes de considerar fechado
- [x] Painel Gestor: visão consolidada funcional — lista todos os consultores ativos (206 hoje)
      cruzando com as apurações já geradas no mês selecionado (seletor de mês/ano por GET),
      cards de total líquido/adesão/recorrência geral e contagem de gerados vs. pendentes.
      Testado com dados reais, carrega em ~1,6s. Ainda falta: gerar direto dessa tela (hoje só
      mostra e aponta pro Comercial), e detalhar o que "financeiro consolidado" deve incluir
      além do que já está aí (perguntar ao cliente se precisa de mais alguma coisa aqui)
- [x] `/gestor/acessos`: gestão de convites de acesso dos consultores (ver seção 6.3)

### 6.8 Relatórios
- [x] PDF consolidado (todos os consultores) por intervalo de datas exato — botão no painel do
      Gestor, gerado por `web/src/lib/relatorios/{consolidado,pdf}.ts` e servido por
      `/api/relatorios/consolidado`. Testado com dados reais (23/07/2026 — recorrência de
      09/07 aparecendo certinho num filtro 01/07 a 15/07).
      **Limite importante**: o relatório só filtra dentro do que já foi apurado/gerado no
      painel Comercial (a apuração continua sendo por mês inteiro) — se um mês nunca foi
      gerado para um consultor, ele não aparece no relatório, e o PDF avisa isso
      explicitamente em vez de fingir que está completo.
- [x] **PDF de cada uma das 5 telas do Consultor** (dashboard + adesões + recorrência +
      rastreadores + inadimplentes) — `/api/relatorios/consultor?tipo=...`, usa o mesmo helper
      de tabela reutilizável (`lib/relatorios/pdf-utils.ts`). Esse helper trunca com reticências
      (`ellipsis: true`) em vez de deixar o texto quebrar linha e desalinhar a tabela — bug real
      visto (nome de consultor longo sobrepondo o total) e corrigido durante o teste.
- [ ] Geração assíncrona/em background do relatório para períodos muito grandes (hoje é síncrono
      dentro da Route Handler; tende a ficar lento se o intervalo cobrir muitos meses/consultores)

### 6.9 Testes e validação
- [ ] Testes com dados reais via API de teste (sem afetar produção)
- [ ] Validação prática com o cliente (comparar com o fechamento manual de um mês já apurado)
- [ ] Ajustes finais de acordo com o feedback

### 6.10 Entrega e manutenção
- [x] Deploy em produção — no ar, mas ainda com escopo parcial (falta Gestor, lote, Omie etc.);
      não é a entrega final ao cliente
- [ ] Repasse rápido de uso para Gestor/Comercial
- [ ] Início do contrato de manutenção mensal (R$ 300/mês)
