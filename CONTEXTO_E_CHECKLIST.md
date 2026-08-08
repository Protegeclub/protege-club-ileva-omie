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
   **✅ RESOLVIDO (13/07/2026)**: achado real comparando com o Ileva ao vivo — o painel
   "Consultores com Mais Ativações" do próprio Ileva mostrou 31 ativações pro consultor #19 em
   06/2026, enquanto nosso sistema mostrava 12. Investigado a fundo (874 veículos, todos os
   boletos de Adesão da carteira puxados direto da API): 12 = boleto Adesão **pago** com data de
   pagamento em junho (nosso critério); 18 = boleto Adesão (qualquer situação) com data de
   vencimento em junho; 29 = veículo com **contrato** iniciado em junho (mais perto do "31" de
   ativações do Ileva). **Cliente confirmou**: a comissão de adesão é contada no mês em que o
   boleto é **efetivamente pago**, não no mês do contrato/venda — ou seja, o "31 ativações" do
   Ileva é uma métrica operacional diferente (contratos fechados), não a métrica financeira de
   comissão. **Nosso sistema já implementava a regra certa desde o início, sem precisar mudar
   nada no código** — o "12" era o número correto o tempo todo, a diferença com o "31" era
   esperada e agora está documentada, não é mais uma dúvida em aberto.
2. **Recorrência ("Assistência Profissional")** — embutida na mensalidade, só é devida depois que
   o boleto do associado é pago. No Ileva, isso é o benefício `cod_beneficio 65` (existem
   variantes 66/110/121). Confirmado com dados reais.
3. **Plano de carreira** — bonificação por volume de veículos vendidos no mês. **Definido e
   implementado em 26/07/2026** (ver seção 6.6): 10+ adesões pagas no mês = R$50 por placa, em
   todas as adesões do mês. ~~Confirmado pelo cliente (30/07/2026): não existem níveis nem
   bonificação de equipe~~ — **revertido em 05/08/2026**: o cliente trouxe um novo documento
   ("Plano de Carreira Protegeclub.pdf") numa reunião nova, com um bônus por nível baseado em
   **placas ativadas no mês** (não adesões pagas — métrica diferente). Ver seção 6.6 pra regra
   completa. `total_premiacao_equipe` continua 0 (isso não mudou — o novo bônus é individual, não
   de equipe).

**Dedução**: veículos acima de R$80mil recebem rastreador; o custo de instalação (R$100) é
descontado do consultor. O corte de R$80mil já vem embutido no nome do plano no Ileva (ex.:
"...Acima de 80 Mil"). ~~Onde exatamente o custo de R$100 é lançado no Ileva ainda não foi
identificado~~ — **resolvido em 11/07/2026**: não é um lançamento específico no Ileva, é uma
regra do nosso sistema — R$100 fixo por veículo com `possui_rastreador = Sim` cujo `dt_contrato`
cai no mês apurado (confirmado batendo com os totais reais do Power BI que o cliente usa hoje,
ver pasta `Telas Cosultores/`).

**RESOLVIDO (30/07/2026)**: líquido = adesão + recorrência − desconto de rastreador, sem piso em
zero — um consultor pode fechar o mês com **líquido negativo** se vender veículo(s) com
rastreador mas não tiver adesão/recorrência suficiente no mesmo mês pra cobrir o desconto (casos
reais: consultor #69 Laura Vitoria, -R$100 em 06/2026; consultor #80 André Gouveia, -R$90 em
06/2026). **Decisão do cliente: manter como está, sem piso em zero e sem carregar pro mês
seguinte** — o valor negativo funciona como aviso pro próprio consultor de que não teve comissão
naquele mês por causa do desconto do rastreador; consultores com desempenho ruim recorrente
serão removidos da base do Ileva pela associação, então não é tratado como um caso especial no
sistema.

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
- **Processamento em segundo plano**: Trigger.dev (projeto "ProtegeClub"), pra geração de
  apuração que não cabe no timeout de função serverless da Vercel — ver seção 6.4/6.7.
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
- [x] Chave de API da Omie obtida e endpoints mapeados (29/07/2026 — ver seção 6.5: ListarClientes,
      ListarCategorias, ListarContasCorrentes, IncluirContaPagar, todos testados/conferidos)
- [x] Regras completas do plano de carreira definidas — bônus individual por volume (26/07/2026)
      + confirmado pelo cliente (30/07/2026) que não há níveis nem bonificação de equipe (ver
      seção 6.6)
- [x] Custo de instalação do rastreador — resolvido (ver seção 2, "Dedução"): não é lançamento
      específico no Ileva, é regra do nosso sistema (R$100 fixo por veículo com rastreador)

### 6.2 Setup do projeto
- [x] Repositório criado no **GitHub**: `Protegeclub/protege-club-ileva-omie` (conta do cliente),
      remote `origin` configurado e branch `main` publicada
- [x] Projeto Next.js iniciado em `web/` (Next 16, TypeScript, Tailwind, App Router) — build e
      lint passando
- [x] Projeto Supabase criado, variáveis preenchidas em `.env` e `web/.env.local`, e migration
      `0001_init.sql` aplicada com sucesso (tabelas `perfis`, `apuracoes_mensais`,
      `auditoria_omie`, `plano_carreira_niveis`, `ileva_token_cache` confirmadas em 11/07/2026).
      **`plano_carreira_niveis` removida em 30/07/2026** (migration `0007`, aplicada no Supabase
      e confirmada — `PGRST205, "Could not find the table"`) — nunca foi usada por nenhum
      código, e o cliente confirmou que não existem níveis no plano de carreira.
- [x] Deploy em produção na Vercel: `protege-club-ileva-omie.vercel.app` — testado de ponta a
      ponta (login, painel do Consultor, geração de apuração pelo Comercial) direto em produção
- [x] `.gitignore` revisado (raiz + `web/`, cobrindo `.env*`, `node_modules/`, `.next/`, `*.mp4`)

### 6.3 Autenticação e controle de acesso
- [x] Login (Supabase Auth) testado de ponta a ponta com sessão real (Playwright,
      `gestor-teste@protegeclub.local`), inclusive redesign completo da tela (26/07/2026)
- [x] Usuário Gestor de teste criado (`marketing@artha.srv.br`) e vinculado em `perfis`
- [x] Usuário Consultor de teste criado (`consultor-teste@protegeclub.local`, vinculado ao
      `cod_consultor 11` real do Ileva — trocado do 313 original em 12/07/2026 pra testar o caso
      de vários boletos em atraso por veículo)
- [x] Usuários de teste criados (12/07/2026): `gestor-teste@protegeclub.local` / `Gestor123!` e
      `comercial-teste@protegeclub.local` / `Comercial123!` (esse último foi reatribuído de
      `comercial` pra `gestor` na unificação abaixo — o e-mail e a senha continuam os mesmos, só
      virou uma segunda conta de Gestor de teste).
- [x] **Unificação Comercial → Gestor (12/07/2026)**: só existem 2 perfis agora — **Gestor**
      (acesso total, inclusive gerar apuração) e **Consultor** (só os próprios dados). O perfil
      "Comercial" foi absorvido pelo Gestor a pedido do Samuel, pra ter um único acesso
      administrativo em vez de dois. O que mudou:
      - `web/src/app/comercial/` foi apagado inteiro; a geração individual e em lote (que morava
        lá) virou `web/src/app/gestor/gerar/` — nova aba "Gerar apuração" no menu do Gestor.
      - `Perfil` (tipo TS) e `roles.ts` não têm mais `'comercial'`. O enum `perfil_tipo` do
        Postgres ainda tecnicamente aceita o valor (Postgres não tem `DROP VALUE` fácil pra
        enum), mas nenhum código escreve ou espera esse valor mais — decisão consciente de não
        arriscar uma migração de enum pra um ganho baixo.
      - Todas as checagens de autorização que aceitavam `perfil === 'gestor' || perfil ===
        'comercial'` viraram só `perfil === 'gestor'`.
      - **Agora dá pra ter vários Gestores** (mais de um responsável com acesso total) — era um
        pedido explícito. `/gestor/acessos` (renomeada de "Acesso dos consultores" pra só
        "Acessos") ganhou uma seção nova "Gestores com acesso" com a lista de quem já tem e um
        formulário pra convidar mais um (nome + e-mail, sem precisar de `cod_consultor` do Ileva
        — diferente do convite de consultor). Mesmo mecanismo de convite por e-mail
        (`inviteUserByEmail`), ninguém fica sabendo senha de ninguém.
      - Testado de ponta a ponta: a conta reatribuída loga como Gestor de verdade, `/comercial`
        agora dá 404, o link "Gerar apuração" aparece no menu, a geração individual funciona
        (disparo real pelo Trigger.dev, confirmado concluído no Supabase), e o Consultor continua
        sem conseguir acessar `/gestor`.
- [x] RBAC entre perfis via `web/src/proxy.ts` — testado localmente contra o Supabase real
      (redireciona corretamente sem sessão)
- [x] Regras de acesso no banco (RLS) — policies aplicadas via `0001_init.sql`; falta testar com
      um usuário/perfil real (nenhum usuário criado no Supabase Auth ainda)
- [x] **Bug real encontrado e corrigido no proxy.ts**: rotas `/api/*` estavam sendo redirecionadas
      pela checagem de perfil por prefixo (pensada pra páginas `/gestor`, `/consultor`, não pra
      endpoints) — um Consultor batendo em `/api/relatorios/consultor` caía de volta no
      `/consultor` antes da rota rodar. `/api/*` agora passa direto (cada Route Handler já
      reconfirma o perfil sozinho).
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
- [x] **Migração de API do Ileva (comunicado oficial recebido em 13/07/2026)**: o Ileva anunciou
      a descontinuação da API antiga (`api-integracao.ileva.com.br`, prazo 20/09/2026) em favor
      de uma nova (`api.ileva.com.br`, obrigatória). **Conferido e confirmado: já estávamos na
      API nova desde o início do projeto** (`ILEVA_API_BASE_URL=https://api.ileva.com.br` no
      `.env`/`.env.local`, e a documentação em `docs/api-ileva/` sempre referenciou esse domínio)
      — nenhuma migração necessária da nossa parte. Testado ao vivo em 13/07/2026: autenticação
      (`/oauth/token`) respondendo normalmente, token emitido com sucesso.
- [x] Autenticação validada (`/oauth/token`) — cliente em `web/src/lib/ileva/client.ts`, com
      cache de token em memória (⚠️ ver nota no código: precisa virar cache compartilhado —
      tabela `ileva_token_cache` já criada na migration — antes de rodar em produção serverless)
- [x] **Bug real encontrado e corrigido**: como o token do Ileva é único por usuário, rodar um
      script de teste em paralelo (ex.: `test-apuracao.mts`) invalidava o token que o servidor
      dev estava usando, e a próxima chamada quebrava com 401 sem tentar de novo. `ilevaGet`
      agora refaz login e tenta a chamada mais uma vez antes de desistir.
- [x] **Segundo bug real, mais sério, encontrado no teste de stress de 12/07/2026 e corrigido**:
      o retry acima não bastava sob concorrência real — com vários consultores/veículos em
      paralelo, múltiplas chamadas podiam tentar logar ao mesmo tempo assim que o token
      precisava renovar, e cada login novo invalidava o token que outra chamada tinha acabado de
      conseguir (só existe 1 token ativo por usuário no Ileva), numa cascata que não se
      recuperava sozinha (45 consultores seguidos falharam com 401 num teste real). Corrigido com
      um mutex (`loginEmAndamento` em `web/src/lib/ileva/client.ts`): chamadas concorrentes que
      precisam de token novo agora esperam o mesmo login em vez de cada uma logar por conta
      própria. **Nota**: isso resolve a concorrência dentro de um processo só; o risco entre
      instâncias serverless diferentes (cada uma com sua própria memória) continua existindo e
      é o motivo de já termos criado a tabela `ileva_token_cache` — ainda não usada de fato,
      ver linha abaixo.
- [x] Funções de leitura escritas e em uso real (`web/src/lib/ileva/api.ts`): consultores,
      veículos, boletos, benefícios
- [x] Motor de apuração (`web/src/lib/apuracao/mensal.ts`): calcula adesão e recorrência de um
      consultor num mês direto na API, com paginação (`inicio_paginacao` é obrigatório — a API
      dá erro 400 sem isso) e concorrência limitada (5 por vez, para não sobrecarregar)
- [x] **Achado importante — agora medido de verdade (12/07/2026)**: consultores variam MUITO em
      quantidade de veículos (de 0 a **871** num caso real) — calcular ao vivo a cada acesso de
      tela não escala para os grandes. Por isso a apuração é **gerada sob demanda** (painel
      Comercial) e salva em `apuracoes_mensais`, não recalculada a cada carregamento do painel do
      Consultor. O teste de stress completo (seção 6.7) confirmou o pior caso: alguns consultores
      levam **até 31 minutos** pra gerar — inviável dentro do timeout de qualquer função
      serverless da Vercel. Precisa virar job em background (ou solução equivalente) antes de
      confiar 100% nisso em produção — ver detalhes e opções na seção 6.7.
- [x] Listagem de todos os consultores (`listarTodosConsultores` em `web/src/lib/ileva/api.ts`)
      — usada no painel do Gestor; rápida (~245 consultores, 1-2 páginas, nada a ver com o
      problema de escala por veículo acima)
- [x] **Geração em lote no painel Comercial (12/07/2026)**: botão "Gerar apuração de todos" gera
      os ~206 consultores ativos de um mês de uma vez. **Decisão de arquitetura**: não é uma
      Server Action só rodando os 206 numa invocação síncrona (arriscado — nunca medimos o tempo
      de um consultor grande tipo o caso de 871 veículos, e uma função serverless tem timeout).
      Em vez disso, `gerarApuracaoUmConsultor` (`comercial/actions.ts`) é chamada um consultor por
      vez, **pelo client** (`gerar-lote-form.tsx`), numa fila com concorrência limitada a 3 (mesmo
      patamar usado internamente por consultor em `comConcorrenciaLimitada`). Isso significa que
      um consultor grande/lento só atrasa aquela linha (fica "erro" se estourar algum limite) sem
      travar o lote inteiro. UI mostra progresso linha a linha (pendente/gerando/ok/erro), permite
      cancelar a qualquer momento (só impede novas chamadas — as já em voo terminam normalmente) e
      tem botão "Tentar novamente os que falharam" (reprocessa só a lista de erro, não o lote
      inteiro). Lógica de cálculo+upsert foi extraída pra `web/src/lib/apuracao/gerar.ts`
      (compartilhada entre a geração individual e a em lote, evita duplicar a regra de negócio).
      Testado com Playwright real: rodou parcialmente (~4 consultores reais, mês fictício 2099/12
      pra não sujar dado real), confirmado que os dados foram salvos certinho no Supabase, que
      "Cancelar" realmente para de iniciar novos (só os já em voo terminam), e os dados de teste
      foram apagados depois.
- [x] **Teste de stress real completo (12/07/2026): 206/206 consultores ativos, 06/2026** — rodado
      de verdade (não é mais estimativa). Dois achados importantes, um deles crítico:
      1. **Bug crítico de concorrência no token do Ileva, encontrado e corrigido.** Na primeira
         rodada completa, a partir do consultor #162 os **45 consultores seguintes falharam em
         cascata** com 401 "Token inválido ou expirado". Causa raiz: `getToken()`/`fetchToken()`
         em `web/src/lib/ileva/client.ts` não tinha proteção contra chamadas concorrentes — como
         um consultor já dispara até 5 chamadas em paralelo internamente
         (`comConcorrenciaLimitada`) e o lote roda 3 consultores ao mesmo tempo, dava pra ter ~15
         chamadas concorrentes num processo só; assim que o token precisava renovar, várias
         chamadas tentavam logar ao mesmo tempo, e cada login novo invalidava o token que outra
         chamada tinha acabado de conseguir (o Ileva só permite 1 token ativo por usuário) — uma
         cascata que nunca se recuperava sozinha. **Corrigido** com um mutex (`loginEmAndamento`):
         chamadas concorrentes que precisam de token novo agora esperam o mesmo login em vez de
         cada uma logar por conta própria. Reprocessados os 45 que falharam depois do fix: **45/45
         ok, zero erro**.
      2. **Achado do "consultor de 871 veículos" confirmado na prática — e é pior do que
         parecia.** Tempo de geração por consultor varia de ~0,3s a **31 minutos**. Outliers reais
         medidos: `#19 Marcos Aurélio Vieira Cabral` — **1886s (~31,4 min)**; `#9 Sanderlan Martins
         Gomes` — 925s (~15,4 min); `#8 Protegeclub` — 887s (~14,8 min); `#6 Rodrigo Cabral Mota`
         — 792s (~13,2 min); `#110 Mirian Alves Aparecida Barros` — 501s (~8,3 min); mais uns 5-6
         consultores na faixa de 1 a 4 minutos. **Isso derruba de vez a viabilidade do modelo atual
         (Server Action síncrona por consultor) em produção na Vercel**: mesmo o timeout mais
         generoso disponível (Fluid Compute, até 800s) não cobre os piores casos. Localmente não
         trava graças à arquitetura "um consultor por chamada, fila no client" (só aquela linha
         demora, o resto do lote segue), mas em produção cada chamada desse tipo estouraria o
         timeout da função serverless e falharia sozinha — o usuário conseguiria gerar ~195-200
         consultores normalmente e teria que tratar os ~5-6 grandes à parte.
      **Conclusão prática**: geração em lote funciona e está íntegra (206/206 gerados, dado real
      confirmado no Supabase), mas os poucos consultores "gigantes" precisam de uma solução
      diferente antes de confiar nisso 100% em produção — candidatos: (a) aumentar
      `maxDuration` da rota/action (cobre só os casos médios, não os de 800s+); (b) job assíncrono
      de verdade (fila + worker, ou trigger + polling de status) para esses casos específicos;
      (c) pré-identificar consultores "grandes" (por contagem de veículos) e gerá-los à parte, sob
      demanda, fora do fluxo síncrono do lote.
      **Decisão tomada (12/07/2026)**: Samuel optou direto pela opção (b) — job assíncrono de
      verdade — em vez de esperar a conversa com o cliente. Trocar de hospedagem foi descartado
      antes disso (não ataca a causa raiz, que é a chamada síncrona presa esperando o
      processamento, não a capacidade do host).
- [x] **Geração de apuração migrada para o Trigger.dev (12/07/2026)** — resolve de vez o problema
      dos consultores "gigantes". Arquitetura:
      - Nova tabela `apuracao_jobs` (`0004_apuracao_jobs.sql`) rastreia status
        (pendente/processando/concluido/erro) por `cod_consultor+ano+mes`, separada de
        `apuracoes_mensais` pra não confundir "gerado com zero" com "ainda não gerado".
      - `web/src/trigger/gerar-apuracao.ts`: a tarefa roda a mesma lógica de sempre
        (`gerarESalvarApuracao`, sem reescrever nada do cálculo) na infraestrutura do
        Trigger.dev, fora da Vercel — sem limite de tempo de função serverless.
        `queue: { concurrencyLimit: 1 }` de propósito: o token do Ileva só permite 1 sessão
        ativa por usuário, e cada execução roda em processo isolado — rodar mais de uma ao
        mesmo tempo reintroduziria a cascata de 401 (seção 6.4), só que entre processos
        diferentes do Trigger.dev em vez de dentro de um único processo Node.
      - `gestor/gerar/actions.ts` (movido do extinto painel Comercial, ver seção 6.3):
        `solicitarApuracao` só dispara (grava "pendente" + aciona a tarefa) e retorna na hora;
        `consultarStatusPeriodo` é consultada em loop pelo client.
      - `GerarApuracaoForm` e `GerarLoteForm` viraram "disparar e acompanhar por status" em vez
        de "esperar a resposta de uma chamada só" — fechar a aba não interrompe o
        processamento, que continua rodando no Trigger.dev de qualquer forma.
      - **Testado de ponta a ponta com sucesso**: consultor 11 (26,8s) e consultor **19 — o pior
        caso medido, 871 veículos — completou em 18min21s rodando pelo Trigger.dev**, sem cair,
        confirmado tanto na tabela `apuracoes_mensais` quanto no painel de Runs do Trigger.dev.
      - **Configurado e validado em produção de verdade (12/07/2026)**: integração Vercel↔
        Trigger.dev instalada (`vercel.com/marketplace/trigger`), as 6 variáveis Ileva/Supabase
        cadastradas manualmente no ambiente Production do Trigger.dev (a sincronização automática
        da integração só trouxe variáveis de uma integração nativa Supabase↔Vercel diferente,
        com nomes genéricos que não servem pro nosso código — teve que ser manual), e
        `TRIGGER_SECRET_KEY` de produção adicionada nas variáveis de ambiente da Vercel (também
        manual — a sincronização automática não levou essa chave sozinha).
      - **Dois bugs reais encontrados e corrigidos só em produção** (o Free Plan roda em
        containers Linux diferentes do ambiente local):
        1. Deploy do Trigger.dev falhava com `Cannot find module '.../trigger.config.mjs'`
           (caminho virando URL codificada) por causa do caminho do projeto ter espaços e acento
           (`Área de Trabalho`) — contornado copiando o projeto pra uma pasta temporária sem
           caracteres especiais só pra rodar `npx trigger.dev deploy` de lá.
        2. Task falhava com `Node.js detected but native WebSocket not found` — o cliente admin
           do Supabase inicializa o Realtime no `createClient()` mesmo sem usarmos realtime, e o
           runtime padrão `"node"` do Trigger.dev não tem WebSocket nativo. Trocado pra
           `runtime: "node-22"` em `trigger.config.ts`.
      - **Confirmado rodando na URL real de produção** (`protege-club-ileva-omie.vercel.app`,
        login como `comercial-teste`): apuração gerada em 27s, salva certinho no Supabase.
      - Plano gratuito do Trigger.dev cobre bem o volume mensal (~206 execuções), sem custo
        adicional pro contrato de manutenção.
      - **Terceiro bug real, encontrado logo depois (12/07/2026)**: a integração Vercel↔
        Trigger.dev vem com "Atomic deployments" e "Auto promotion" ligados por padrão — isso faz
        a Vercel só promover um deploy pra produção depois que o build automático do Trigger.dev
        (disparado por ela mesma a cada push) terminar com sucesso. Como fazemos o deploy da
        tarefa manualmente pelo CLI (por causa do bug do caminho com espaço/acento, ver acima),
        esse build automático da integração ficava tentando e falhando (referenciava um
        deployment inexistente, "Not Found"), **travando os deploys do site na Vercel** — dois
        commits seguidos ficaram em "Checks Failed" sem ir pro ar. Corrigido desligando os
        toggles **"Atomic deployments"** e **"Auto promotion"** na tela de configuração da
        integração (Trigger.dev → Organization Settings → Integrations → Vercel → Configure).
        Deploys voltaram a promover normalmente, confirmado com um redeploy real. **Consequência
        prática pro fluxo de trabalho**: o deploy da tarefa pro Trigger.dev precisa ser feito
        manualmente (`npx trigger.dev deploy --env prod`, de uma pasta sem espaço/acento no
        caminho) — não é mais automático a partir do push.
        **⚠️ Pegadinha real (14/07/2026)**: não é só quando `web/src/trigger/gerar-apuracao.ts`
        muda — é sempre que **qualquer arquivo que essa tarefa importa** muda, incluindo
        `lib/apuracao/mensal.ts` e `lib/apuracao/gerar.ts` (a lógica de cálculo em si). Esquecemos
        disso ao adicionar a aba "Placas Ativadas": o código mudou, o site foi ao ar normal
        (deploy da Vercel), mas a tarefa do Trigger.dev continuou rodando a versão **antiga** até
        alguém regenerar manualmente e notar que o campo novo vinha vazio. **Regra prática**:
        depois de qualquer mudança em `web/src/lib/apuracao/*` (não só em `web/src/trigger/`),
        rodar `npx trigger.dev deploy --env prod` antes de considerar a mudança "no ar de
        verdade".
      - **Redesenho visual + quarto bug real (13/07/2026)**: a pedido do Samuel, a tela
        `/gestor/gerar` ganhou visual novo (ícones, cards, barra de progresso segmentada
        verde/vermelho em tempo real, cronômetro, filtro por status) — ver
        `web/src/app/gestor/gerar/{barra-progresso,icones,usar-cronometro}.tsx`. No processo,
        achado um bug real de robustez: o disparo do lote (~205 consultores) rodava no
        **client**, um por vez, numa fila JS — fechar a aba **antes de terminar de enfileirar
        todo mundo** deixava quem ainda não tinha sido disparado sem rodar nunca, contradizendo a
        promessa de "pode fechar essa aba". `tasks.batchTrigger` pareceria a solução (1 chamada
        só), mas foi testado e descartado: os runs não aparecem no worker local (`trigger.dev
        dev`) nem depois de mais de 1 minuto — não confiável o bastante pra validar. Corrigido
        movendo o laço de disparo inteiro pra **dentro da Server Action** (`solicitarApuracaoLote`
        em `gestor/gerar/actions.ts`), com concorrência limitada (4) e retentativa — imune a
        fechar a aba, já que roda inteiro no servidor numa execução só.
      - **Achado real sobre limite de fila do Trigger.dev**: durante os testes repetidos (vários
        meses fictícios disparados em sequência sem esperar o anterior esvaziar), a API passou a
        recusar novos disparos com `"queue size limit... maximum size is 500"`. Isso é um limite
        real do ambiente (plano gratuito), não um bug do nosso código — só aconteceu por empilhar
        vários lotes de teste de ~205 itens um em cima do outro. Em uso real (~206 consultores,
        uma vez por mês, com o mês anterior já esvaziado há tempo), fica bem abaixo do limite.
        **Cuidado pra não repetir em teste**: não clicar "Gerar apuração de todos" várias vezes
        seguidas sem esperar o lote anterior esvaziar.
- [x] **Variantes de "Assistência Profissional" identificadas e validadas (30/07/2026)** —
      consultado `/veiculo/listar-beneficios`: código 65 é o principal (ativo); 66 e 110 estão
      **inativos** no próprio Ileva (sem risco real); 121 é uma variante regional ativa
      ("Assistência Profissional Senador Canedo"). Achado real ao testar boletos pagos de
      veículos com o benefício 121 (consultores #261 Lucas Ferreira Nunes e #119 Josué Lira
      Dias): o sistema **já reconhece o código 121 corretamente**, mas o valor desse lançamento
      vem cadastrado como **R$0,00 direto no Ileva** em todos os 7 boletos conferidos — não é bug
      do nosso cálculo, é o dado de origem. **Decisão do cliente (30/07/2026): manter só o que o
      Ileva fornece, sem correção manual/hardcoded** — se o valor lá é R$0,00, o sistema mostra
      R$0,00 pra esses consultores, mesmo que pareça uma configuração incompleta no Ileva (fora
      do escopo deste sistema corrigir o cadastro de benefícios de origem).
- [x] **Incidente real em produção: sistema inteiro fora do ar por App Key do Ileva morta
      (06/08/2026), causa raiz era um usuário de API esquecido desde julho.** `/gestor` (e
      qualquer tela que chama o Ileva) começou a devolver 500 ("This page couldn't load").
      Investigação completa via `vercel logs --query 'status:500' --json` (não `vercel logs`
      sozinho, que só mostra build log) revelou a causa real, escondida atrás de um erro genérico
      do Next em produção ("Server Components render... digest omitido"):
      `Falha ao autenticar na API do Ileva (401): "App key expirada"`.
      - **Causa raiz de verdade**: o usuário de integração que estava rodando produção o tempo
        todo era `Testes API - sistema de apuração - somente leitura` — o usuário **só-leitura
        criado em 05/07/2026** (`docs/PLANO_TESTES_API.md`) pra mapear endpoints em segurança,
        com plano explícito de trocar por um "usuário definitivo" antes de ir pra produção. Essa
        troca nunca foi feita — ficou rodando produção mais de um mês, e a App Key dele (com
        expiração configurada desde a criação) expirou em 05/08/2026.
      - **Gerar uma chave nova pro mesmo usuário não resolveu** (tentado 2x, com o Samuel gerando
        e salvando corretamente no painel do Ileva) — o Ileva agora tem uma **API V3** que exige
        um **usuário criado especificamente pra ela** (aviso só visível dentro do painel de
        Integrações: "Para acessar a API V3 é necessário criar um usuário no sistema"). O usuário
        antigo, mesmo com chave nova, não é reconhecido pela V3 — o erro genérico "App key
        inválida ou expirada" não diferencia isso de uma chave errada, o que custou tempo real de
        diagnóstico (cheguei a suspeitar de bloqueio de conta/rate limit antes de achar o aviso).
      - **Resolvido de verdade**: Samuel criou um usuário novo (`Sistema Ileva + Omie V3`, cod 76,
        mesmas permissões, mesmo e-mail/senha de sempre) pelo fluxo novo da V3, gerou a App Key
        pra esse usuário — funcionou de primeira (autenticação + `/consultor/listar` reais,
        confirmado local antes de tocar em produção).
      - **Achado extra, bug real do processo de deploy**: `npx vercel redeploy <url> --target
        production` builda uma versão nova e marca "Ready", mas **não promove automaticamente**
        pro domínio de produção — o domínio continuava servindo o deployment antigo mesmo depois
        do redeploy "funcionar". Precisa de `npx vercel promote <deployment-id>` explícito depois
        (confirmado: só resolveu de vez com esse comando). Isso pode ter mascarado falsos
        negativos em qualquer redeploy anterior feito só por CLI (os feitos pelo botão "Redeploy"
        do painel da Vercel, direto, não têm esse problema — só o CLI).
      - **Antes de achar a causa real**, o `.env.local` e o `total_bonus_nivel` (seção acima)
        chegaram a ser suspeitos por engano (coincidência de timing com o redeploy do bônus por
        nível) — descartado rápido comparando local (`next start`, mesmo build) vs. produção, que
        não reproduziu nada.
      - **Lição prática pra não repetir**: `usuarioapi`/usuários de API do Ileva não têm um jeito
        óbvio de saber "qual está realmente em uso pela produção" só olhando o painel — o
        `.env`/`.env.local` é a fonte de verdade de qual usuário/chave está configurado. Vale
        eventualmente criar uma checagem periódica (ou só lembrar visualmente na próxima renovação
        de chave) de que o usuário de API em uso não é mais o de teste do início do projeto.
- [ ] Rotina periódica de atualização (cron/job) em vez de gerar manualmente pelo Gestor

### 6.5 Integração com Omie
- [x] **Chave de API obtida e validada (29/07/2026)** — Samuel recebeu App Key + App Secret reais.
      **Achado importante**: não é uma chave de sandbox/teste — é a conta de produção de
      verdade da Protege Club (`ListarClientes` retornou 3.908 registros reais, cadastros desde
      01/2024). Todo cuidado de escrita nessa integração parte do princípio de que é dado real.
      As chaves estavam só no `.env` da raiz, faltando copiar pra `web/.env.local` (runtime real
      do app) — corrigido.
- [x] Autenticação validada (chamada real `ListarClientes`, só leitura, 200 OK)
- [x] Payload exato de `IncluirContaPagar` conferido contra a documentação real da Omie
      (developer.omie.com.br) — 3 divergências corrigidas em relação ao que estava só de
      memória: campo é `id_conta_corrente` (não `codigo_conta_corrente`), `data_previsao` é
      obrigatório (não só `data_vencimento`), resposta traz `codigo_lancamento_omie` (não
      `codigo_lancamento`).
- [x] Criação do título a pagar implementada (`lib/omie/client.ts` incluirContaPagar +
      `lib/omie/contas-pagar.ts` enviarContaPagar) — **nunca chamada automaticamente**, só por
      ação explícita do Gestor na nova tela `/gestor/omie`, um consultor por vez, com
      confirmação visual antes de enviar (decisão do Samuel, 29/07/2026, dado o histórico de
      erros de vínculo e o fato de ser produção real).
- [x] Código de integração por lançamento (`apuracao-<apuracao_id>`) — idempotente, reprocessar
      a mesma apuração nunca duplica o título.
- [x] Log de auditoria (`auditoria_omie`, já existia desde a migration inicial) — grava
      'pendente' antes de chamar a Omie, depois 'enviado'/'erro' com o retorno completo.
- [x] Rotina de validação: a tela `/gestor/omie` mostra quem está sem vínculo confirmado antes
      de deixar enviar (botão desabilitado sem vínculo + configuração).
- [x] **Vínculo consultor↔fornecedor**: o Ileva não devolve CPF/CNPJ do consultor (só aceita
      como filtro de busca, não retorna no cadastro — confirmado com chamada real). Sem chave
      confiável pra casar automaticamente, o sistema sugere por nome (`lib/omie/vinculo.ts`,
      comparando com os ~3.900 clientes/fornecedores da Omie) e o Gestor confirma manualmente na
      tela, uma vez por consultor (fica salvo em `consultor_omie_vinculo`). Migration
      `0006_omie_vinculo.sql` **aplicada no Supabase em 29/07/2026** (tabelas confirmadas).
- [ ] **Conta corrente**: categoria financeira já definida (**2.06.99 — Salários**), mas a conta
      corrente ainda não — Samuel vai confirmar com o financeiro. Configurar pela tela
      `/gestor/omie` assim que souber (tabela `omie_configuracao`, coluna de categoria já pode
      ser preenchida, falta só `codigo_conta_corrente`). O botão de enviar fica desabilitado até
      as duas estarem preenchidas.
- [ ] **Teste real supervisionado**: combinado com o Samuel (29/07/2026) fazer o primeiro envio
      de verdade acompanhado em tempo real (valor simbólico, conferir no Omie, e permitir
      excluir se precisar) — ainda não feito, só a leitura (ListarClientes/Categorias/Contas) foi
      testada de verdade até agora. **Bloqueado pela conta corrente acima.**

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
      **Bug real corrigido (12/07/2026)**: mostrava só o boleto mais antigo em atraso por
      veículo, escondendo atrasos empilhados. Agora lista todos — validado com caso real
      (consultor 11, veículo 2740: 3 boletos em aberto, dez/2025 a mai/2026).
- [x] **Total Equipe**: soma as adesões dos colegas da mesma equipe (`cod_equipe`) que também já
      tiveram apuração gerada no mesmo mês — quem não gerou ainda não entra na conta.
- [x] **Comissão gerencial do Thiago (#302) — regra específica (21/07/2026)**: a pedido do
      Samuel, o consultor #302 (Thiago Siqueira Abba, gerente) recebe R$2,00 por placa ativada
      no mês de **todos os outros consultores**, exceto ele mesmo e a equipe #19 (Marcos
      Aurélio Vieira Cabral, equipe "Marcos Cabral", `cod_equipe=7` — confirmado via API real,
      50 consultores nessa equipe). Confirmado com o Samuel que as próprias placas do Thiago
      **não contam** (só as dos outros, pra não duplicar comissão). Implementado em
      `web/src/lib/apuracao/comissao-gerencial.ts` (constantes
      `COD_CONSULTOR_COMISSAO_GERENCIAL_PLACAS=302`,
      `COD_EQUIPE_EXCLUIDA_COMISSAO_GERENCIAL=7`, `VALOR_COMISSAO_GERENCIAL_POR_PLACA=2`),
      chamado de `gerar.ts` só quando `cod_consultor === 302` (zero custo extra pros outros 204).
      Nova coluna `total_comissao_gerencial` (migration `0005_comissao_gerencial.sql`, já
      aplicada em produção) + breakdown por consultor salvo em
      `detalhe.comissaoGerencialPlacas` (auditável). Novo card "Comissão de Gerência" nos dois
      dashboards (Consultor e Gestor) e nova linha no PDF do dashboard — ambos só aparecem
      quando o valor é > 0 (na prática, só pro Thiago). Criado também
      `calcularTotalReceber()` em `consultor/tipos.ts` — único lugar que soma os componentes do
      "Total a receber", pra não arriscar a fórmula divergir entre os dois dashboards.
      **Limitação operacional importante** (mesma lógica do "Total Equipe" acima): o valor só
      conta quem **já tem apuração gerada** nesse mês/ano — se a apuração do Thiago for gerada
      antes da dos outros consultores, sai subestimado e não se autocorrige depois. **Sempre
      gerar a apuração do Thiago por último**, depois do lote completo do mês. Testado de ponta
      a ponta com dado real (julho/2026): calculado de forma independente direto no banco antes
      (1 placa de 1 consultor = R$2,00, equipe 7 corretamente excluída) e depois batido contra o
      resultado real da geração (rodou local com `trigger.dev dev` contra produção) — bateu
      exato, inclusive confirmando que a placa do próprio Thiago (ele tinha 1) não entrou na
      conta. **Pendente**: redeploy manual do Trigger.dev em produção (mudou `gerar.ts`, que é
      dependência da tarefa) antes que isso valha em produção de verdade — ver nota na seção 6.4.
- [x] **Bônus por Performance (premiação individual) implementado (26/07/2026)** — a partir do
      PDF `docs/GANHOS E INCETIVOS CORRETO ATUALIZADO.pdf` enviado pelo cliente: 10+ adesões
      pagas no mês libera R$50 por placa, aplicado a TODAS as adesões daquele mês (não só a
      partir da 10ª). Confirmado com o Samuel que este documento **substitui** a regra antiga —
      o exemplo do Power BI (19 adesões → R$1.150) era de um cálculo anterior, já superado; pela
      regra atual, 19 adesões = 19×R$50 = R$950. Implementado em
      `lib/apuracao/premiacao-individual.ts` (função pura, testável) + `gerar.ts` (grava
      `total_premiacao_individual`, que já existia na tabela e já era lido/exibido em todo o
      sistema — só ficava sempre 0). **Redeploy do Trigger.dev feito com sucesso em 27/07/2026**
      (versão `20260727.3`, task `gerar-apuracao` detectada) — já vale em produção.
- [x] ~~Confirmado pelo cliente (30/07/2026): não existem "níveis" nem "premiação de equipe"~~ —
      decisão **revertida em 05/08/2026** (ver bullet "Bônus por Nível" abaixo). O bônus
      individual por adesões (acima) continua igual; `total_premiacao_equipe` fica permanentemente
      0 (o novo bônus por nível é individual, não é a "premiação de equipe" que foi descartada).
- [x] **Bônus por Nível do plano de carreira, implementado (05/08/2026)** — a partir do PDF
      "Plano de Carreira Protegeclub.pdf" enviado pelo cliente numa reunião nova. Duas escalas
      **independentes**, ambas usando a contagem de **placas ativadas no mês** (mesma métrica de
      `dt_contrato` já usada na aba Placas Ativadas — não é "adesão paga"; confirmado com o
      Samuel em 05/08/2026 depois de eu ter lido o PDF errado numa primeira passada e ele ter
      corrigido item por item em vez de eu deduzir):
      1. **Bônus em R$** (soma na comissão líquida) — tabela de 19 patamares (25 placas→R$600 até
         720 placas→R$18.600), paga o valor do **maior patamar atingido** (não soma patamares
         menores); abaixo de 25 placas ativadas no mês, R$0. Constantes em
         `lib/apuracao/bonus-nivel.ts` (`PATAMARES_BONUS_NIVEL`, `calcularBonusNivel`), somado ao
         `totalLiquido` em `gerar.ts` e persistido em `apuracoes_mensais.total_bonus_nivel`
         (migration `0009_bonus_nivel.sql`, aplicada em produção).
      2. **Nível de gestão** (só título/tag de exibição, não afeta valor) — os 8 nomes do PDF
         (Líder Júnior, Líder, Líder Senior, Líder Master, Coordenador, Gerente, Gestor Senior,
         Gestor Master), cada um com seu próprio patamar de placas ativadas (15/30/45/60/90/240/
         360/720) — **patamares diferentes dos do bônus em R$ acima**, de propósito (confirmado
         com o Samuel: são duas escalas que não coincidem, ex. 100 placas ainda é "Coordenador"
         mas já paga R$4.500, não R$3.600). `calcularNivelGestao()` em `bonus-nivel.ts`, calculado
         em tela (não precisa de coluna própria — deriva de `detalhe.placasAtivadas.length`, que
         já existia). Tag exibida ao lado do nome do consultor, só em
         `/gestor/consultor/[cod]` e `/consultor` (espelhados) — não aparece na lista
         `/gestor/consultores`, a pedido do Samuel.
      - `calcularTotalReceber()` (`consultor/tipos.ts`), o PDF do dashboard individual
        (`lib/relatorios/consultor.ts` + `api/relatorios/consultor/route.ts`) e os dois
        `SELECT_APURACAO` (`consultor/dados.ts` + `gestor/consultor/[cod]/dados.ts`) atualizados
        pra incluir `total_bonus_nivel` — mesmo padrão dos outros componentes de comissão
        (premiação individual, comissão gerencial). Relatórios agregados
        (`gestor/consultores`, `gestor/dashboard-mes.ts`, PDFs "Todos os Consultores" e
        "Consolidado") **não precisaram de mudança** — só leem `total_liquido` já persistido.
      - Testado de ponta a ponta com dado real: consultor #303 (julho/2026, 29 placas ativadas)
        regenerado de verdade — bateu no patamar de 25 placas (R$600), tag "Líder Júnior"
        aparecendo certinho nos dois painéis (screenshot conferido), `total_liquido` reconciliando
        (R$2.490 adesão + R$286 recorrência − R$600 rastreador + R$700 premiação individual +
        R$600 bônus de nível = R$3.476,00), PDF do dashboard gerando normalmente. `tsc`, `eslint`
        e `npm run build` limpos. Conta de teste temporária (`teste-nivel-303@...`) criada e
        removida ao final, sem deixar rastro.
      - **Redeploy do Trigger.dev feito (06/08/2026)** — versão `20260806.1`, task `gerar-apuracao`
        detectada, deploy de `C:\deploy-temp\web` (mesmo workaround de sempre pro caminho com
        espaço/acento). Já vale em produção.
- [x] Fechamento mensal consolidado por consultor — gravado em `apuracoes_mensais`, com upsert
      por `(cod_consultor, ano, mes)` (gerar de novo sobrescreve o mês)

### 6.7 Telas
- [x] **Painel do Consultor reestruturado igual ao Power BI atual** (11/07/2026, baseado nos
      prints da pasta `Telas Cosultores/`): sidebar com ano/mês/toggle de equipe/sair
      compartilhada entre as telas, dashboard com "Total a receber" + botões de navegação +
      cards, e as telas de detalhe (adesões, recorrência, rastreadores, inadimplentes) com as
      mesmas colunas do sistema de origem. Só premiação (individual/líder de equipe) continua
      como placeholder — bloqueado pelas regras do plano de carreira.
- [x] **Nova aba "Placas Ativadas" (14/07/2026)** — a pedido do Samuel, depois do achado real de
      13/07 (consultor #19 mostrava 31 "ativações" no Ileva vs. 12 adesões no nosso sistema,
      cliente confirmou que comissão é pelo pagamento, não pela ativação — ver seção 2). Essa aba
      existe pra dar visibilidade à métrica **operacional** (veículos com `dt_contrato` no mês),
      complementando a visão financeira de Adesões — deixa claro no texto da tela que **não entra
      em nenhum total de comissão**. Implementada nos dois painéis (Consultor e
      `/gestor/consultor/[cod]`, espelhadas como as outras 4 abas), sem chamada extra à API (os
      veículos já são buscados durante a apuração) — `PlacaAtivadaItem` em
      `lib/apuracao/mensal.ts`, persistido em `detalhe.placasAtivadas`, com PDF próprio
      (`tipo=placas-ativadas`). **Meses já gerados antes de 14/07/2026 precisam ser gerados de
      novo pra essa aba aparecer preenchida** (o campo não existia no `detalhe` antes disso).
      Testado de ponta a ponta com dado real (consultor 11, julho/2026). **Confirmado também no
      consultor #19** (o caso do achado de 13/07): esquecemos de reimplantar a tarefa do
      Trigger.dev depois do commit que adicionou essa aba (ver nota "Pegadinha real" acima), então
      a primeira regeneração de 16/07 saiu com o campo ausente (0 placas); redeploy manual da
      tarefa + nova regeneração resolveu — `detalhe.placasAtivadas` do consultor #19 em 06/2026
      veio com 29 placas, batendo com o valor que o Samuel via ao vivo no Ileva. Samuel confirmou
      em 16/07/2026 que está OK.
- [x] **Painel Gestor: "Gerar apuração" (`/gestor/gerar`, ex-painel Comercial, unificado em
      12/07/2026)**: formulário funcional para gerar a apuração de um consultor por vez (por
      `cod_consultor` + mês/ano), **mais a geração em lote de todos os ativos** (ver seção 6.4) —
      falta uma tela de conferência antes de considerar fechado
- [x] Painel Gestor: visão consolidada funcional — lista todos os consultores ativos (206 hoje)
      cruzando com as apurações já geradas no mês selecionado (seletor de mês/ano por GET),
      cards de total líquido/adesão/recorrência geral e contagem de gerados vs. pendentes.
      Testado com dados reais, carrega em ~1,6s. Ainda falta: detalhar o que "financeiro
      consolidado" deve incluir além do que já está aí (perguntar ao cliente se precisa de mais
      alguma coisa aqui)
- [x] **Gestor: busca por nome/código + filtro por equipe + drill-down por consultor**
      (12/07/2026) — campo de busca (`q`, casa nome ou `cod_consultor` exato) e select de
      equipe na mesma tela `/gestor`; nome do consultor virou link pra
      `/gestor/consultor/[cod]`, que replica as 5 telas do painel do Consultor (dashboard +
      adesões + recorrência + rastreadores + inadimplentes) só que pro Gestor ver de **qualquer**
      consultor — `web/src/app/gestor/consultor/[cod]/dados.ts` usa o cliente admin direto (sem
      passar pelo `perfis` de quem está logado, diferente de `consultor/dados.ts`), já que a
      autorização de qualquer coisa embaixo de `/gestor` é do próprio Gestor. Testado com
      Playwright real (login como `gestor-teste@protegeclub.local`) navegando pelas 4 sub-telas
      do consultor 11 e conferindo os valores.
- [x] **Gestor: ordenação por coluna na tabela principal (18/07/2026)** — cabeçalhos Consultor,
      Equipe, Adesão, Recorrência, Desconto rastreador e Líquido viraram links clicáveis
      (`?sort=campo&dir=asc|desc`, clicar de novo inverte a direção, seta ▲/▼ indica a coluna
      ativa). Implementado 100% via URL/server component (sem client component novo) — mesmo
      padrão dos filtros de equipe/busca que já existiam. Sem `sort` na URL, mantém o
      comportamento padrão de sempre (gerados primeiro por líquido decrescente, depois
      pendentes por nome). Testado com Playwright real: clique em "Líquido" ordena
      decrescente, segundo clique inverte pra crescente; clique em "Consultor" ordena
      alfabético.
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
- [x] **PDF em lote "todos os consultores" (12/07/2026)** — botão "Baixar PDF de todos" no
      painel Gestor (`/api/relatorios/gestor/todos`, gerado por
      `web/src/lib/relatorios/todos-consultores.ts`). Diferente do PDF consolidado (seção 6.8
      acima, que é uma tabela-resumo por intervalo de datas): este é a apuração detalhada de UM
      mês/ano específico, com uma **seção separada por consultor** (não uma linha de tabela),
      respeitando os mesmos filtros de busca/equipe já aplicados na tela. Quem não tem apuração
      gerada nesse mês entra numa lista à parte no fim do PDF, não é omitido silenciosamente.
      Testado com dados reais: PDF de todos (7 páginas/consultores) e filtrado por equipe
      (subconjunto menor) — ambos gerados corretamente.
- [x] **Exportação organizada por equipe, nos dois relatórios em lote (18/07/2026)** — a pedido
      do Samuel: "PDF de todos" (`todos-consultores.ts`) e "Relatório resumido por período"
      (`consolidado.ts` + `pdf.ts`) agora agrupam os consultores em **seções por equipe** (com
      subtotal de líquido por equipe) quando nenhuma equipe específica é escolhida — antes o
      "PDF de todos" listava todo mundo numa lista só ordenada por líquido, e o "Relatório
      resumido" nem tinha noção de equipe. O filtro de equipe (select já existente na tela pro
      "PDF de todos"; select novo adicionado ao formulário do "Relatório resumido") continua
      funcionando pra baixar **só uma equipe** — nesse caso vira naturalmente uma seção única.
      Testado com dados reais (Julho/2026, 204 consultores/17 equipes): PDF de todos sem filtro
      saiu com 17 seções "Equipe:", com filtro saiu com 1; relatório consolidado sem filtro saiu
      com 13 seções, com filtro ficou restrito à equipe escolhida.

### 6.9 Testes e validação
- [ ] Testes com dados reais via API de teste (sem afetar produção)
- [x] **Validação prática com o cliente — feita e bateu (04/08/2026)**: o cliente comparou o
      fechamento de Julho/2026 (apurado manualmente do lado dele) com os números do sistema, e
      confirmou que bateu. Esse era o maior bloqueador de processo pro lançamento — resolvido.
      Um ponto levantado durante a validação: existem veículos com valor abaixo de R$80mil que
      mesmo assim têm rastreador instalado (`possui_rastreador = "Sim"` no Ileva). **Conferido no
      código (mensal.ts, tela de Desconto de Rastreadores nos dois painéis, e o PDF) — nenhum dos
      três filtra por valor do veículo em nenhum momento**; o desconto de R$100 e a listagem
      sempre usam só `possui_rastreador = "Sim"`, independente do preço. O corte de R$80mil é uma
      regra de elegibilidade do lado do Ileva/associação (o valor decide quem *recebe* o
      rastreador lá), nunca um filtro do nosso sistema — coerente com a decisão de sempre confiar
      no dado que o Ileva fornece (ver seção 2). Nenhuma mudança de código foi necessária.
- [x] **Investigação: 2 associados "faltando" nas adesões de julho do consultor #19 (04-05/08/2026)**
      — o Samuel reportou (com prints do Ileva) que Marcelo de Moraes Oliveira Cintra e LG
      Mangueiras e Parafusos Ltda apareciam como ativos/pagos em julho no Ileva mas não na aba
      Adesões do nosso sistema pro consultor #19. Duas causas bem diferentes:
      - **Marcelo — staleness pura, resolvido.** A apuração salva era de 31/07 02:03; o boleto de
        Adesão dele foi pago no mesmo dia às 09:27, depois da apuração ter sido gerada. Uma
        regeneração (`gerarESalvarApuracao`) resolveu — passou a aparecer, `total_adesao` foi de
        R$4.113,10 pra R$4.463,10 (19→20 itens).
      - **LG Mangueiras — não é staleness, não é bug, é ausência real de dado no Ileva.**
        Mesmo numa apuração fresquíssima (gerada pelo lote de 211 consultores que o próprio Samuel
        disparou depois) o associado continua sem aparecer. Investigação direta na API do Ileva
        (`veiculo/listar` + `cobranca/listar-associado-veiculo`) achou o veículo do mês certo
        (cod_veiculo 4017, BYD Dolphin Mini, placa "0KM" — carro novo, sem placa definitiva ainda,
        `dt_contrato` 20/07/2026) e confirmou: ele tem **uma única cobrança no Ileva, tipo
        "Fechamento" (mensalidade), ainda "Aberto"** (não pago, vencimento 20/08/2026) — **não
        existe boleto tipo "Adesão" pra esse veículo**. Comparando com os outros 8 veículos do
        mesmo associado (todos ativados entre 11/2025 e 06/2026): em **todos eles** o padrão é
        Adesão paga ~1 semana após `dt_contrato`, só depois começando os Fechamentos mensais — só
        esse veículo de julho quebrou o padrão e pulou direto pro Fechamento, sem Adesão nenhuma.
        Nosso sistema conta adesão pelo pagamento do boleto tipo "Adesão" (regra confirmada com o
        cliente em 13/07 — ver seção 2); como esse boleto nunca foi gerado/pago no Ileva, não há
        nada pra aparecer em julho. **Não é um bug do nosso lado** — é uma cobrança que falta (ou
        está atrasada) no Ileva, possivelmente porque o veículo ainda está "0KM" sem placa
        definitiva (hipótese, não confirmada). Ação recomendada: o Samuel confirmar com o
        financeiro/Ileva se a Adesão desse veículo será cobrada (aí aparece no mês em que for paga,
        normalmente) ou foi esquecida/perdida.
      - **Efeito colateral real e útil da investigação**: achado e corrigido um bug de concorrência
        genuíno no cliente do Ileva (`lib/ileva/client.ts`) — zerar o token em cache sem checar se
        ele já tinha sido renovado por outra chamada concorrente causava uma cascata de 401 em
        lotes grandes; virou um retry com contador + backoff (300/800/1500ms). **Reimplantado no
        Trigger.dev em produção (05/08/2026)** — versão `20260805.1`, task `gerar-apuracao`
        detectada (1 task), deploy feito a partir de `C:\deploy-temp\web` (workaround de sempre
        pro caminho com espaço/acento, ver seção 6.4). **Ainda não commitado no git** — o deploy do
        Trigger.dev empacota os arquivos locais direto, não depende de commit; falta só o `git
        commit` pra manter o histórico do repositório coerente com o que já está rodando em
        produção.
- [ ] Ajustes finais de acordo com o feedback
- [x] **Descartada (12/07/2026)**: usar o Power BI antigo do cliente como fonte de validação
      cruzada ao vivo. O Samuel confirmou que o Power BI tem dados incompletos e o cliente já
      parou de usá-lo — é justamente o motivo de estarem construindo este sistema. Os prints da
      pasta `Telas Cosultores/` continuam válidos como referência de **layout/colunas** (já
      usados pra isso), mas não devem ser tratados como fonte de números corretos pra comparar.
      A validação real continua sendo a de cima: fechamento manual de um mês já apurado,
      diretamente com o cliente.

### 6.10 Entrega e manutenção
- [x] Deploy em produção — no ar, mas ainda com escopo parcial (falta Gestor, lote, Omie etc.);
      não é a entrega final ao cliente
- [ ] Repasse rápido de uso para Gestor/Comercial
- [ ] Início do contrato de manutenção mensal (R$ 300/mês)

### 6.11 Performance
- [x] **Cache de `listarTodosConsultores`/`buscarConsultor` (18/07/2026)** — a pedido do Samuel
      ("quero que esse sistema seja rápido... quando clico nos botões demora, parece que o
      sistema é pesado"). Root cause medido de verdade (não suposição): toda navegação em
      `/gestor`, `/gestor/gerar`, `/gestor/acessos` e nas 5 sub-telas do Consultor/Gestor
      (quando o toggle "ver equipe" está ligado) refazia uma chamada **ao vivo** ao Ileva
      (`ilevaGet` usa `cache: 'no-store'` de propósito, ver `lib/ileva/client.ts`) — medido em
      isolado: ~1,4s de login (token) + ~0,6s+0,2s de paginação quando o token não está quente.
      Isso sozinho já explicava várias centenas de ms a alguns segundos por clique. Envolvido
      agora em `unstable_cache` (Next), 60s de `revalidate`, já que o cadastro de
      consultores/equipe muda raramente — depois do cache, a mesma chamada sai em 1-12ms.
      Medido com Playwright + timing real de servidor (`console.time`, removido depois) contra
      `next start`: `/gestor` foi de ~carregar do zero pra ~300-350ms até a tabela aparecer
      (`domcontentloaded` + tabela visível), `/gestor/gerar` e `/gestor/acessos` em
      120-260ms. **Cuidado ao medir isso de novo**: `page.waitUntil: 'networkidle'` do
      Playwright deu leituras falsas de 8-29s nesse ambiente (alguma conexão que não fecha) —
      meça sempre com `domcontentloaded` + `waitForSelector`, não com `networkidle`.
      **Efeito colateral notado**: como `/gestor/gerar` e `/gestor/acessos` não tinham mais
      nenhuma chamada `no-store` no caminho de render, o Next passou a tratar as duas rotas
      inteiras como estáticas/ISR (`revalidate: 1m` no build) — inclusive as queries diretas
      ao Supabase nelas (perfis/gestores/convites), que antes eram sempre "ao vivo". Não é um
      problema de segurança (a autenticação continua sendo sempre reforçada pelo `proxy.ts` a
      cada request, independente de a página ser estática ou não) nem de dado cruzado entre
      usuários (o conteúdo dessas páginas não é personalizado por quem está logado). O risco
      real seria mostrar dado importante desatualizado por até 1 min — mitigado porque as
      Server Actions de convite (`gestor/acessos/actions.ts`) já chamavam `revalidatePath` antes
      disso, então o cache é invalidado na hora certa depois de qualquer convite.
      **Revisão de segurança dos dados (18/07/2026, a pedido do Samuel — "isso interfere
      negativamente nos dados?")**: auditados todos os usos de `buscarConsultor` pra achar
      qualquer lugar onde um cache de 60s pudesse gravar algo errado no banco ou disparar uma
      ação com dado errado (bem mais grave que só "carregar devagar"). Achados dois pontos
      sensíveis e corrigidos — os dois agora usam `buscarConsultorSemCache` (nova função
      exportada, sem cache) em vez da `buscarConsultor` cacheada:
      1. `lib/apuracao/mensal.ts` (motor de cálculo): o `cod_equipe` retornado é **persistido**
         em `apuracoes_mensais` — um cache de 60s podia gravar a equipe errada no mês apurado se
         o consultor tivesse acabado de trocar de equipe no Ileva. Não afeta valor de comissão
         (adesão/recorrência/desconto vêm 100% ao vivo de `listarTodosVeiculosDoConsultor`/
         `listarCobrancasPorVeiculo`, nunca cacheados), só a classificação de equipe salva.
      2. `gestor/acessos/actions.ts` (convidar consultor): usa o e-mail retornado pra mandar o
         convite — um cache de 60s podia mandar pro e-mail antigo se tivesse sido corrigido no
         Ileva pouco antes do convite.
      A `buscarConsultor` cacheada continua em uso só onde é 100% exibição em tela/PDF (toggle
      "ver equipe" do painel Consultor/Gestor, agrupamento por equipe no PDF individual) — nunca
      grava nada nem dispara ação. Também verificado empiricamente (Playwright, dois
      consultores de equipes diferentes, um logo depois do outro): o cache do Next diferencia
      corretamente por `cod_consultor` — não houve contaminação entre consultores.
      `listarTodosConsultores` (a outra função cacheada) só alimenta listas/relatórios de
      exibição em todos os pontos onde é usada — nenhum grava nem age sobre o resultado, então
      não precisou de ajuste.
- [x] **Ordenação/filtro do painel Gestor 100% client-side (18/07/2026)** — a tabela principal
      de `/gestor` (antes toda em `page.tsx`, servidor) foi dividida: o server component
      (`page.tsx`) só busca os dados de ano/mês (única coisa que realmente exige um novo
      request); equipe, busca por nome/código e ordenação de coluna viraram estado de um Client
      Component novo (`TabelaGestor.tsx`), filtrando/ordenando o array já carregado na hora, sem
      nenhum round-trip ao servidor. Clique em cabeçalho de coluna, troca de equipe e busca por
      nome agora são instantâneos (confirmado com Playwright: nenhuma navegação disparada,
      `page.url()` não muda). O botão "Baixar PDF de todos" continua respeitando o filtro atual
      (o link é montado no cliente a partir do estado corrente de equipe/busca).

### 6.12 Identidade visual (rebrand)
- [x] **Repaginação visual completa dos painéis Gestor e Consultor (18/07/2026)** — a pedido do
      Samuel, com o `Manual de Identidade Visual_Protege Club.pdf` (colocado em `web/public/`)
      como referência. Escopo combinado: só aparência (nenhuma mudança de dado/lógica), fundo
      branco/texto preto mantidos, resto seguindo a paleta e tipografia da marca, moderno e
      profissional, sem piorar a velocidade do site.
  - **Cores institucionais** aplicadas via `@theme` do Tailwind v4 em `globals.css`: navy
    `#002A54` (`brand-navy`, cromia primária — botões primários, header de tabela, estado ativo
    de navegação/filtros), azul claro `#25A9E1` (`brand-blue`, secundária — anéis de foco, links
    secundários, ícone-tiles), laranja `#F19100` (`brand-orange`, destaque — reservado pro único
    botão de ação principal por card/seção, ex.: "Baixar PDF", "Gerar apuração"). Cores
    semânticas de status (emerald=sucesso, amber=aviso, red=erro) foram preservadas exatamente
    como estavam — não fazem parte da identidade da marca.
  - **Regra de contraste calculada** (WCAG, não estimada): botão navy usa texto branco
    (14.4:1), mas botão azul-claro/laranja usa texto navy — texto branco neles reprova até pra
    texto grande (~2.4-2.7:1). Isso está embutido no componente `Botao`.
  - **Tipografia**: Gotham (a da marca) é paga, sem licença de uso web — substituída por
    **Montserrat** (`next/font/google`, pesos 400/500/600/700, auto-hospedada), o par gratuito
    mais próximo. De quebra, corrigido um bug real: `globals.css` tinha
    `font-family: Arial, Helvetica, sans-serif` fixo no `body`, que sobrescrevia a fonte
    carregada — o site inteiro renderizava em Arial, nunca em Geist (a fonte antiga).
  - **5 componentes novos** em `web/src/lib/ui/` (`Botao`, `Cartao`+`CartaoCabecalho`, `Selo`,
    `Banner`, `CabecalhoPagina`) — todos Server Components puros (sem `'use client'`, sem
    hooks), pra não vazar JS extra em nenhuma página que hoje já é 100% servidor. Confirmado com
    grep + comparação do "First Load JS" do build antes/depois: nenhuma rota ganhou JS.
  - Aplicado em ~30 arquivos: as 10 telas de relatório (5 do Consultor + 5 espelhadas no
    Gestor, que já eram idênticas byte a byte), os 3 dashboards, os 3 `layout.tsx` +
    `filtros-sidebar.tsx`, a tela `gestor/gerar` (cards, ícone-tiles, barra de progresso — essa
    ficou intocada, já era só cor semântica + largura dinâmica), `gestor/acessos`, login e
    definir-senha (ganharam o logo, que antes não tinha em nenhum dos dois).
  - **Navegação ativa no header do Gestor**: novo `nav-links.tsx` (único Client Component novo
    deste trabalho, com `usePathname()`, mesmo padrão já usado em `filtros-sidebar.tsx`) —
    mostra qual aba (Apuração/Gerar apuração/Acessos) está ativa, coisa que não existia antes.
  - **Radius padronizado**: `rounded-xl` pra cards/tabelas (antes era `rounded-md`/`rounded-lg`
    misturado sem critério — só a tela de gerar apuração usava `rounded-xl`), `rounded-lg` pra
    botões/inputs, `rounded-full` pra selos/pills.
  - Testado de ponta a ponta com Playwright real (login, dashboard do Gestor, detalhe de
    consultor, uma tela de relatório, gerar apuração, acessos) — screenshots conferidos
    visualmente, não só build passando. Build, `tsc --noEmit` e `eslint` limpos (os poucos
    problemas de lint nos arquivos tocados já existiam antes desta sessão — confirmado
    comparando com o commit anterior — não foram introduzidos por este rebrand).

### 6.13 Menu lateral (navegação)
- [x] **Header horizontal trocado por menu lateral fixo e recolhível (21-22/07/2026)** — a
      pedido do Samuel, no estilo de dashboards modernos (referências que ele mandou: sidebar
      escura, ícone+rótulo, card de usuário, botão de recolher). Escopo só de
      navegação/layout — **nenhuma lógica de dado foi tocada** (confirmado explicitamente com o
      Samuel antes de começar: motor de apuração, cálculos, regra da comissão gerencial etc.
      continuam exatamente iguais).
  - **`SidebarGestor`** (`web/src/app/gestor/sidebar.tsx`) — 3 itens (Apuração, Gerar apuração,
    Acessos); "Apuração" fica destacado também dentro do detalhe de qualquer consultor
    (`/gestor/consultor/[cod]/*`), já que é uma tela "filha" da lista.
  - **`SidebarConsultor`** (`web/src/app/consultor/sidebar.tsx`) — 6 itens (Dashboard, Adesões,
    Recorrência, Descontos de Rastreadores, Placas Ativadas, Inadimplentes) — navegação
    persistente que **não existia antes** nesse painel (só dava pra chegar nas sub-telas pelos
    botões da própria dashboard, que continuam existindo). Os links carregam a querystring
    atual (`ano`/`mes`/`equipe`) pra não resetar o período selecionado ao trocar de tela pelo
    menu — testado de verdade: mudar o ano pela barra de filtro e depois clicar num item do
    menu preserva o ano escolhido na URL de destino.
  - Os filtros de período (ano/mês/equipe), que antes eram uma segunda sidebar vertical
    (`FiltrosSidebarGestor`/`FiltrosSidebar`), viraram uma **barra horizontal** no topo do
    conteúdo (`filtros-toolbar.tsx` nos dois painéis) — decisão deliberada (não só estética):
    duas sidebars lado a lado tomariam ~464px de largura permanentemente contra telas com
    tabelas largas; a barra horizontal custa altura uma vez só. O botão "Sair" que existia
    dentro da sidebar de filtro do Consultor foi removido (duplicava o Sair que agora vive no
    rodapé do `SidebarConsultor`).
  - Componentes novos compartilhados: `ItemNavSidebar` (`lib/ui/item-nav-sidebar.tsx`, item de
    menu sem lógica própria) e `icones-sidebar.tsx` (ícones SVG desenhados à mão, mesmo estilo
    de `gerar/icones.tsx`, sem dependência nova) — e `buscarUsuarioLogado()`
    (`lib/auth/usuario-logado.ts`), função única usada pelos dois layouts pra mostrar
    nome/perfil no card do menu (evita duplicar a mesma query de `perfis`).
  - Nova variante `fantasma-claro` no `Botao` (`lib/ui/botao.tsx`) — o "fantasma" normal
    (borda/texto cinza) fica quase invisível sobre o fundo navy do menu; usada só pelo
    `BotaoSair` dentro da sidebar.
  - **Efeito colateral aceito conscientemente**: `buscarUsuarioLogado()` chama `cookies()`, o
    que forçou `/gestor/gerar` e `/gestor/acessos` de volta pra renderização dinâmica por
    request (antes eram estáticas/ISR, ver seção 6.11) — confirmado comparando a tabela de
    rotas do `next build` antes/depois. Custo pequeno e aceito: o `proxy.ts` já faz uma consulta
    de auth + `perfis` em toda requisição pra essas rotas mesmo hoje (controle de acesso), então
    é mais uma query pequena em cima de um custo que já existia.
  - Removidos (código morto após a troca): `gestor/nav-links.tsx`, os dois
    `filtros-sidebar.tsx` antigos, `lib/ui/logo-titulo.tsx` (não sobrava nenhum uso depois que o
    header virou sidebar).
  - Testado de ponta a ponta com Playwright real (Gestor: dashboard, recolher/expandir,
    detalhe de consultor com "Apuração" ainda ativo, tela de relatório, gerar apuração, acessos;
    Consultor: dashboard, navegação pelo menu preservando o período). **Achado durante o
    teste, sem relação com esta mudança**: logo depois do login, a URL às vezes fica em `/` em
    vez de redirecionar pra `/consultor` (o conteúdo certo aparece, só a barra de endereço não
    atualiza) — reproduzido também sem qualquer alteração deste trabalho (`proxy.ts`/
    `login/actions.ts` não foram tocados), então é uma particularidade pré-existente do fluxo
    de login, não introduzida aqui. Efeito prático mínimo: o item do menu não aparece destacado
    só nesse instante específico, se corrige na primeira navegação real.
  - **Conta de teste do Consultor** (`consultor-teste@protegeclub.local`) não tinha senha
    documentada — defini `Consultor123!` (mesmo padrão de `Gestor123!`/`Comercial123!`) via
    Supabase Admin API pra poder testar o painel do Consultor de ponta a ponta.

### 6.14 Dashboard do Gestor e reforma da lista de consultores (24-25/07/2026)
- [x] **Separação Dashboard vs Lista**, a pedido do Samuel (sequência de ~14 pedidos de
      refinamento visual num único fio de conversa) — `/gestor` virou a tela de **dashboard**
      (KPIs + gráficos), e a tela antiga (filtros + tabela) mudou pra **`/gestor/consultores`**.
      A sidebar ganhou o item "Consultores" (ícone novo `IconeLista` em `icones-sidebar.tsx`).
  - **Dashboard** (`gestor/page.tsx` + `gestor/dashboard-graficos.tsx`): 6 KPIs (Líquido, Adesão,
    Recorrência, Desconto rastreador, Placas ativadas, Apurados), um gráfico de linha fina
    (evolução do líquido/adesão nos últimos 6 meses), dois donuts finos (status das apurações —
    Gerado/Pendente/Processando/Erro — e composição Adesão vs Recorrência), e dois rankings (top
    consultores/equipes por adesões no mês) com barra proporcional em CSS puro — sem gráfico ali
    de propósito, pra manter leve. Toda a agregação vem de `lib/apuracao/dashboard-mes.ts`
    (`montarDashboardMes`) — só soma/conta/agrupa o que já está salvo em `apuracoes_mensais` e
    `apuracao_jobs`, nenhuma fórmula nova.
  - **Recharts** entrou como dependência nova, mas só é carregado nessa rota (`/gestor`) — o
    Next.js separa o bundle por página, então não pesa em nenhuma outra tela do sistema (pedido
    explícito do Samuel: "gráficos leves pra não sobrecarregar o sistema").
  - **Lista de consultores** (`gestor/consultores/page.tsx` + `TabelaGestor.tsx`) reorganizada em
    blocos — antes tudo (filtros + PDF + KPIs + tabela) misturado numa página só:
    - Cabeçalho: título "Apuração de Comissões" + período + "Última atualização" (maior
      `gerado_em` já gravado no mês) + botões Atualizar (`router.refresh()`) e Gerar PDF.
    - KPIs em estilo "Stripe" (ícone + valor + tendência "▲/▼ X% · Mês anterior: RS Y",
      comparando com o mesmo conjunto filtrado do mês anterior).
    - Filtros em pílula solta (sem card/borda ao redor, sem rótulo flutuando em cima de cada
      campo) — Equipe/Consultor filtram na hora (client-side, sem round-trip); Mês/Ano exigem o
      "Aplicar" porque trocam o mês inteiro de apuração buscado no servidor. Busca de consultor
      alargada e com placeholder descritivo, estilo GitHub.
    - Tabela em estilo "Notion": sem linhas horizontais, só hover cinza; badges de status
      "estilo HubSpot" (Gerado/Pendente/Processando/Erro, cruzando `apuracoes_mensais` com a
      tabela `apuracao_jobs` que já existia pra acompanhar o Trigger.dev — não é dado novo, só
      leitura nova); hierarquia visual nas colunas de dinheiro (Líquido em destaque com barra
      proporcional embaixo, demais colunas mais claras); menu "⋮" por linha com "Baixar PDF" e
      **"Recalcular"** (reaproveita `solicitarApuracao`, a mesma Server Action que
      `/gestor/gerar` já usa pra disparar uma geração individual no Trigger.dev — não é lógica
      nova, só um atalho novo pra ela).
  - Testado de ponta a ponta com Playwright real (dashboard, lista, filtro por equipe, busca por
    nome, menu de ações abrindo/fechando, navegação Dashboard ↔ Consultores ↔ detalhe do
    consultor, `/gestor/gerar`, `/gestor/acessos`) — zero erros de console/página em toda a
    sequência.
  - **Escopo respeitado em todas as rodadas**: nenhuma alteração em
    `lib/apuracao/{mensal,gerar,equipe,comissao-gerencial}.ts` nem em `trigger/*` — tudo aqui é
    leitura/apresentação do que já estava calculado e salvo. Sem redeploy do Trigger.dev
    necessário.

### 6.15 Correção do domínio de convite + reforma de `/gestor/acessos` (25/07/2026)
- [x] **Bug real corrigido: link de convite saía com o domínio errado.** `redirectTo` do
      `inviteUserByEmail` era montado a partir do header `Origin` da requisição (`headers().get(
      'origin')`) — ou seja, o domínio que o Gestor por acaso estava usando no navegador no
      momento do clique (podia ser `localhost` num teste local, por exemplo), não um valor fixo.
      Corrigido com uma variável nova, `NEXT_PUBLIC_SITE_URL` (adicionada em `web/.env.local`,
      **ainda precisa ser adicionada nas variáveis de ambiente de Production na Vercel** pra
      valer em produção), priorizada sobre o `Origin` em `gestor/acessos/actions.ts`
      (`obterUrlBase()`). **Pendente de conferir**: se
      `https://protege-club-ileva-omie.vercel.app/definir-senha` está na lista de "Redirect URLs"
      permitidas no Supabase (Authentication → URL Configuration) — sem isso lá, o link pode
      continuar quebrando mesmo com o domínio certo no código.
- [x] **"Remover acesso"** — botão (depois migrado pro Drawer, ver abaixo) que apaga o usuário do
      consultor no Supabase Auth (`admin.auth.admin.deleteUser`); a linha em `perfis` some junto
      via `on delete cascade` (migration `0001_init.sql`). Não mexe em nada do Ileva nem em
      `apuracoes_mensais`, só revoga o login. Novo convite depois recria do zero.
- [x] **Reforma completa de `/gestor/acessos`**, a pedido do Samuel (coluna Status, busca,
      filtros, cards de resumo, Drawer estilo HubSpot):
      - **Status real por consultor** (não só "tem/não tem acesso" como antes): 🟢 **Ativo**
        (`email_confirmed_at` preenchido no Supabase Auth — já confirmou/definiu senha), 🟡
        **Convite pendente** (perfil existe, ainda não confirmou), ⚪ **Nunca convidado** (sem
        perfil). Badges no mesmo estilo "HubSpot" já usado em `TabelaGestor.tsx` (fundo claro +
        bolinha + rótulo).
      - **Busca + filtros de Status/Equipe** — tudo client-side (`tabela-acessos.tsx`), mesmo
        padrão de `TabelaGestor.tsx`, sem round-trip ao servidor.
      - **Cards de resumo** (Gestores, Consultores, Acessos ativos, Pendentes, Sem acesso) —
        contagens fixas (não reagem aos filtros da tabela), calculadas uma vez no servidor.
      - **Drawer lateral** (`drawer-consultor.tsx`) substitui os botões que ficavam direto na
        linha — clicar num consultor abre um painel deslizante (Nome, Equipe, E-mail editável,
        Status) com ações que mudam conforme o status: Nunca convidado → Enviar convite;
        Pendente → Reenviar convite + Copiar link; Ativo → Copiar link (redefinição de senha) +
        Remover acesso. `convidar-button.tsx` e `remover-acesso-button.tsx` (antigos botões de
        linha) foram removidos — a lógica deles migrou pro Drawer.
      - **Duas ações novas em `actions.ts`**: `reenviarConvite` (chama `inviteUserByEmail` de
        novo pra quem ainda não confirmou — mesmo mecanismo do botão "Resend invitation" do
        próprio dashboard do Supabase) e `gerarLinkAcesso` (usa `generateLink`, que só devolve a
        URL sem disparar e-mail nenhum — tipo `invite` pra pendente, `recovery` pra ativo, pra
        copiar e mandar manualmente por WhatsApp etc.). Mais `editarEmailConsultor`
        (`admin.auth.admin.updateUserById`, troca o e-mail de login sem exigir confirmação, ação
        de admin).
      - **Achado real durante o teste, não relacionado a este trabalho**: a tabela `perfis` está
        com **zero linhas de consultor** agora (só as 5 linhas de Gestor) — todos os consultores
        que tinham acesso antes (confirmados em sessões de teste anteriores) sumiram. Suspeita
        forte: o pause/restore do projeto Supabase (que aconteceu no meio desta mesma sessão de
        trabalho) restaurou um backup anterior à criação desses perfis. Confirmado direto no
        banco (script standalone fora do Next.js, sem cache nenhum no meio) — não é bug de
        exibição. **Ainda não resolvido** — Samuel precisa conferir os backups do Supabase.
      - Testado com Playwright real (cards, busca, filtro por Status/Equipe, abrir/fechar o
        Drawer, cancelar edição de e-mail sem salvar) — zero erros de console. **Não testado de
        propósito** (mesma cautela de sempre): enviar/reenviar convite, gerar link, editar e-mail
        e remover acesso de verdade — e também não dá mais pra testar os estados "Ativo"/
        "Pendente" com dado real até algum consultor ser convidado de novo (ver achado acima).
        **Atualização (26/07/2026)**: o link gerado por `gerarLinkAcesso` descrito acima (o do
        botão "Copiar link") tinha um bug real — ver correção completa na seção 6.16.

### 6.16 Bugs reais corrigidos (26/07/2026)
- [x] **Link de convite/acesso consumido antes da hora (preview de WhatsApp/scanner de e-mail).**
      Sintoma relatado pelo Samuel: convite pro consultor #302 dava "Link inválido ou expirado"
      mesmo gerado na hora, e continuava dando errado mesmo usando "Copiar link" (sem passar por
      e-mail nenhum). Causa raiz: tanto o e-mail de convite quanto o botão "Copiar link" usavam o
      link **hospedado do próprio Supabase** (`.../auth/v1/verify?token=...`), que redime o token
      de uso único com um simples GET — qualquer coisa que "visite" a URL antes da pessoa (o
      preview automático que WhatsApp/Telegram/Slack geram ao colar um link, ou um scanner de
      segurança de e-mail corporativo) já consome o token, e o clique de verdade cai em
      `otp_expired`. **Corrigido**: `gerarLinkAcesso` (`gestor/acessos/actions.ts`) agora monta
      link próprio pra `/definir-senha?token_hash=...&type=invite|recovery` em vez de devolver
      `action_link`; `definir-senha/page.tsx` troca esse `token_hash` pela sessão de verdade via
      `supabase.auth.verifyOtp(...)`, chamado só por JS quando um navegador de verdade carrega a
      página — bots de preview não executam JS, então não conseguem mais consumir o token à toa.
      **Pendente**: o e-mail de convite em si (`inviteUserByEmail`) ainda usa o template padrão do
      Supabase com `{{ .ConfirmationURL }}` (o link antigo, vulnerável) — pra corrigir precisa
      trocar pra `{{ .SiteURL }}/definir-senha?token_hash={{ .TokenHash }}&type=invite` em
      Authentication → Email Templates → Invite user no painel do Supabase, e isso exige SMTP
      próprio configurado (o Supabase bloqueia edição de template no e-mail compartilhado
      padrão). Enquanto isso não é feito, o caminho seguro é sempre usar "Copiar link" (já
      corrigido) em vez de "Enviar convite"/"Reenviar convite" por e-mail.
- [x] **Contagem do progresso do lote incluindo consultores já inativos.** Um lote de julho/2026
      com 195 consultores ativos mostrava "209" no progresso ("X de 209 processados"). Causa:
      `consultarStatusPeriodo` devolve **toda** linha de `apuracao_jobs` já criada pra aquele
      ano/mês, inclusive de consultores que ficaram inativos depois que o lote foi disparado — o
      laço principal de polling (`acompanharAtePronto` em `gerar-lote-form.tsx`) usava esse
      retorno bruto sem filtrar pela lista de ativos atual (só a condição de "quando parar de
      acompanhar" já filtrava certo). Corrigido filtrando pela lista de consultores ativos antes
      de montar o total exibido — mesma lógica que já existia corretamente na função de "retomar
      acompanhamento ao voltar pra tela" (ver 6.13/adjacente), só que agora também no laço
      principal.
- [x] **Duas investigações que não eram bugs** (documentadas pra não serem reabertas à toa):
      1. Comissão gerencial do Thiago (#302, ver 6.6) saiu R$0,00 em junho/2026 — não é bug: a
         apuração dele foi gerada em 16/07/2026, **5 dias antes** da regra existir no código
         (criada em 21/07/2026). Corrigido só regenerando a apuração dele depois que os outros
         consultores já estavam todos gerados.
      2. Consultor #64 "preso" na fila do Trigger.dev por 50+ minutos, visto no painel do
         Trigger.dev — não é bug: `queue: { concurrencyLimit: 1 }` (ver 6.4) processa **um
         consultor por vez** de propósito (limite de sessão única do token do Ileva), então um
         lote de ~200 consultores demora horas pra passar por todos, e 50min de espera pra um
         item no meio da fila é esperado, não uma falha.

### 6.17 Redesign visual completo (26/07/2026)
- [x] **Sequência de redesigns visuais** a pedido do Samuel, cobrindo praticamente todo o
      sistema — cada rodada com a mesma regra combinada: só aparência/organização visual, **zero**
      mudança de lógica, cálculo, consulta, API, estado ou hook. Ordem: Consultores → Gerar
      apuração (2 rodadas, a segunda virou "Centro de Apuração") → Dashboard → Painel do
      Consultor (as duas versões espelhadas: `/gestor/consultor/[cod]` e `/consultor`).
  - **Decisão repetida em toda rodada**: ícones continuam **SVG desenhado à mão**, sem Lucide —
    o Samuel pediu Lucide em quase todo prompt, mas já existe uma decisão anterior (seção 6.13)
    de não ter dependência de ícones pra manter o bundle pequeno; mantida por padrão em vez de
    reabrir a pergunta toda vez.
  - **Componentes compartilhados novos** em `web/src/lib/ui/`: `CardKpi` (ícone circular colorido
    + valor + tendência opcional, extraído de `TabelaGestor.tsx` depois de virar a 3ª tela a
    precisar do mesmo card), `CardAtalho` (módulo clicável ícone+título+descrição+seta),
    `CardFinanceiro` (KPI com sparkline), `CardMeta` (placeholder "Meta ainda não definida",
    já que o plano de carreira segue sem regras — ver 6.1/6.6), `TimelineMovimentacoes` e
    `graficos-consultor.tsx` (Recharts: área de produção mensal, donut de composição, barra de
    adesões por mês, sparkline), `BotaoAtualizarPagina` (client component mínimo só pro botão
    "Atualizar" em páginas 100% servidor).
  - **Dashboard** (`gestor/page.tsx`, `dashboard-graficos.tsx`, `lib/apuracao/dashboard-mes.ts`):
    KPIs ganharam comparação com mês anterior (nova leitura do período anterior, mesmo padrão já
    usado em Consultores), gráfico de linha virou área com gradiente e 3 séries (antes só
    Líquido/Adesão, Recorrência foi adicionada), donuts ganharam legenda lateral com percentual,
    novo gráfico de barras horizontais por equipe, "Última atualização" e botão Atualizar no
    cabeçalho (não existiam antes).
  - **Painel do Consultor** (`gestor/consultor/[cod]/page.tsx` + `consultor/page.tsx`,
    `dados.ts`/`tipos.ts` compartilhado): header com avatar/nome/equipe/referência e card grande
    de "Total a receber"; KPIs com tendência; os 5 botões de navegação viraram cards clicáveis;
    novo bloco de resumo financeiro com sparkline; 3 gráficos novos; timeline de movimentações
    (só reapresenta cronologicamente adesões/recorrências/descontos/placas que já existiam em
    `detalhe`, sem lógica nova — `montarTimeline()` em `consultor/tipos.ts`); card de meta.
    Exigiu nova leitura do período anterior + histórico de 6 meses por consultor (mesmo padrão do
    Dashboard) pra alimentar tendências/gráficos/sparklines.
  - **"Centro de Apuração"** (`gestor/gerar/*`, segunda rodada de redesign dessa tela): card de
    status da competência (apurado/pendente/em andamento/com erro, cor conforme a situação real),
    status geral (API Ileva online/offline, última sincronização, mês atual, consultores ativos,
    quem executou), KPIs, velocidade/tempo restante estimado durante o processamento, timeline de
    log e busca na tabela do lote.
    - **"Status da API Ileva" não é uma chamada nova**: é a chamada já existente
      (`listarTodosConsultores`) envolvida em try/catch — antes uma falha real do Ileva derrubava
      a página inteira; agora mostra "Offline" com um banner, sem quebrar.
    - **Achado real, corrigido duas vezes**: tentei calcular "tempo de execução" a partir de
      `apuracao_jobs` (`solicitado_em`/`atualizado_em`) e o resultado deu números absurdos (115min
      e depois 73min por consultor) — `solicitado_em` marca o momento de **enfileirar**, não o
      início real do processamento, e com `concurrencyLimit: 1` (ver 6.16 item 2 acima) um
      consultor no fim da fila espera bastante antes de começar. A conta misturava tempo de fila
      com tempo de execução. Medir isso direito exigiria um novo carimbo gravado pelo próprio
      processamento em segundo plano (fora do escopo de um ajuste "só visual") — a métrica foi
      **removida** em vez de mostrada errada, com o motivo documentado em comentário no código.
  - **Bônus consistentes entre as telas**: o badge de status "Gerado" (apurações concluídas)
    passou de verde pra **laranja da marca**, a pedido explícito do Samuel, em toda tela que
    mostra esse status (Consultores, Gerar apuração, donut do Dashboard) — mesmo motivo de sempre
    (cor da marca > cor semântica genérica quando o cliente pede). Botão "destaque" (laranja) do
    componente `Botao` passou a usar **texto branco sem borda** (era navy, por contraste WCAG —
    decisão de marca do Samuel, documentado no código que fica abaixo do AA de propósito).
  - Testado com Playwright real em cada rodada (login, screenshots, conferência visual) — não só
    build passando. `tsc`, `eslint` e `npm run build` limpos em todas as rodadas.

### 6.18 Gestão de acessos: remoção de Gestor (26/07/2026)
- [x] Só existia remoção de acesso pro Consultor (seção 6.15); adicionada a mesma capacidade pro
      Gestor (`removerAcessoGestor` em `gestor/acessos/actions.ts` + botão na tabela "Gestores com
      acesso"). Duas travas que não existem do lado Consultor porque não fazem sentido lá: não
      deixa remover o **último** Gestor com acesso (ninguém mais poderia gerenciar acessos
      depois) nem remover **a si mesmo** (evita logout acidental no meio da própria sessão).
      **Achado real ao usar**: o hard delete (`admin.auth.admin.deleteUser`) falhou com erro 500
      do próprio servidor do Supabase pra uma conta específica (`comercial-teste@protegeclub.local`,
      a antiga conta "Comercial" reatribuída pra Gestor na unificação da seção 6.3) — parece uma
      inconsistência no registro dela. O soft-delete (`deleteUser(id, true)`) funcionou (a pessoa
      não consegue mais logar), mas por não ser um DELETE de verdade não disparou a cascata que
      apaga a linha em `perfis` — precisou apagar essa linha manualmente à parte. Não é um
      problema esperado pra contas normais (só aconteceu nessa conta específica, com histórico de
      reatribuição); se acontecer de novo com outra conta, o caminho é o mesmo: soft-delete +
      apagar a linha órfã de `perfis` manualmente.

### 6.19 Bug financeiro real: recorrência duplicada em boleto multi-veículo (07/08/2026)
- [x] **Achado a partir de uma pergunta simples do Samuel** ("tem dados repetidos, é normal?" ao
      ver a mesma placa duas vezes na tela de Recorrência do consultor #19). Investigação com dado
      real revelou um bug de contagem genuíno, não uma coincidência:
      - Um boleto "Fechamento" pode cobrir **várias placas do mesmo associado num boleto só**
        (comum em conta de frota/família — ex.: um boleto real do consultor #19 cobria 7 placas).
        Esse boleto aparece na listagem de cobranças de **cada uma** dessas 7 placas
        individualmente. `apurarConsultorMes` (`mensal.ts`) processa placa por placa
        (`comConcorrenciaLimitada(veiculos, 5, ...)`), e pra cada placa que "enxergava" esse
        boleto, buscava o detalhe (`buscarCobranca`) e relançava os lançamentos de **todas** as 7
        placas de novo — sem nenhuma deduplicação por `cod_cobranca`. Resultado real medido: um
        boleto de 7 placas gerava 7×7=**49** lançamentos salvos (na prática, 42, já que só 6 das 7
        placas apareciam na busca individual) em vez de 7. Isso inflava `total_recorrencia` (e por
        tabela, `total_liquido`) de verdade — não era só exibição repetida na tela.
      - **Impacto medido no caso real**: consultor #19, julho/2026 — 468 linhas de recorrência
        salvas (deveriam ser 368), `total_recorrencia` R$11.944,24 (correto: R$9.102,02) — o
        consultor estava recebendo **R$2.842,22 a mais** só nesse mês.
      - **Corrigido**: `cobrancasFechamentoProcessadas` (um `Set<number>` de `cod_cobranca`,
        marcado antes do `await buscarCobranca` — seguro mesmo com concorrência 5, já que
        JS é single-thread e não há `await` entre o `.has()`/`.add()`) garante que cada boleto de
        Fechamento só é processado uma vez, não importa quantas placas do mesmo associado ele
        cubra. Adesão **não** tem esse problema (checado numa amostra de 200 veículos do
        consultor #19: zero boletos de Adesão multi-veículo — faz sentido, adesão é cobrada por
        veículo individualmente na hora da venda, não em conta agrupada).
      - **De quebra, corrigido também**: nome do associado em branco em algumas linhas de
        Recorrência — mesma causa raiz relacionada (quando a placa do lançamento não está na
        lista de veículos deste consultor, cai pro `boleto.nome_associado`, já disponível na
        mesma chamada, em vez de string vazia).
      - Testado de ponta a ponta com dado real (consultor #19, julho/2026, antes/depois): boleto
        específico de 7 placas confirmado com exatamente 7 linhas após o fix (era 42).
      - **Pendente**: redeploy do Trigger.dev (mudou `mensal.ts`, dependência de `gerar-apuracao`)
        — aguardando confirmação antes de fazer.
- [x] **Coluna "Data Pagamento" adicionada na tela de Recorrência** (Consultor + Gestor
      espelhado) e no PDF correspondente — o dado (`dt_pagamento`) já existia em `RecorrenciaItem`,
      só não era exibido. Mesmo padrão já usado em Adesões.
- [x] **Contagem de recorrências exibida** — novo card KPI "Recorrências" nos dois dashboards
      (Consultor + Gestor, cor `violet` pra não colidir com "Produção da equipe" que já usava
      azul) com tendência vs. mês anterior, e o rodapé da tabela de Recorrência agora mostra
      "Total (N recorrências)" junto do valor em R$.
- [x] **Premiação Individual (Bônus por Performance) trocada de métrica: adesões pagas → placas
      ativadas no mês** — a pedido explícito do cliente (07/08/2026). O gatilho (10+) e o
      multiplicador (R$50 por unidade) continuam iguais, só a contagem que entra na conta mudou.
      `premiacao-individual.ts`: `LIMITE_ADESOES_BONUS_PERFORMANCE` renomeada pra
      `LIMITE_PLACAS_BONUS_PERFORMANCE`, campo `quantidadeAdesoes` renomeado pra
      `quantidadePlacasAtivadas` (refletindo o dado real, evita confusão futura). `gerar.ts` agora
      chama `calcularPremiacaoIndividual(resultado.placasAtivadas.length)` em vez de
      `.adesoes.length`. Textos de tela atualizados nos dois dashboards. Testado com dado real
      (consultor #19: 28 placas ativadas × R$50 = R$1.400,00, batendo exato).
- [x] **Redesign dos cards de atalho (Adesões/Recorrência/Descontos/Placas/Inadimplentes)** — a
      pedido do Samuel, várias rodadas de ajuste fino de cor até fechar em: fundo navy sólido,
      selo circular **branco** com ícone no **mesmo navy do card** (não laranja nem azul claro —
      testado nas duas variantes antes de fechar nessa), texto branco. `CardAtalho`
      (`lib/ui/card-atalho.tsx`) deixou de usar o `Cartao` compartilhado (que fixa fundo branco)
      e passou a estilizar o `<div>` direto, mesmo padrão já usado no bloco "Total a receber" do
      dashboard.
- [x] **Card "Comissão do plano de carreira" no Resumo Financeiro** — novo `CardFinanceiro` nos
      dois dashboards (Consultor + Gestor) mostrando `total_bonus_nivel` em R$ junto com a tag do
      nível de gestão atual (reaproveitando `calcularNivelGestao`, já usado no cabeçalho). Exigiu
      um `selo?: string` opcional novo em `CardFinanceiro` (só esse card usa) e adicionar
      `total_bonus_nivel` no histórico de evolução (`PontoEvolucaoConsultor`/`LinhaEvolucaoRow`/
      `montarEvolucao` em `consultor/tipos.ts` + `SELECT_EVOLUCAO` nos dois `dados.ts`) pra
      alimentar o sparkline dos últimos 6 meses, mesmo padrão dos outros cards financeiros.
- [x] **Referência da mensalidade + formato de data BR na tela de Recorrência (07/08/2026)** —
      a pedido do Samuel, pra dar visibilidade de controle sobre **qual mês** cada pagamento de
      recorrência se refere (importante especialmente depois do achado da seção 6.19: um mesmo
      associado pode ter vários boletos de referências diferentes pagos no mesmo mês, e isso é
      esperado, não bug — ver explicação do Samuel confirmando esse comportamento). Novo campo
      `referencia: string | null` em `RecorrenciaItem` (`mensal.ts`), populado direto de
      `detalhe.referencia` (já vinha na resposta do `buscarCobranca`, só não era guardado).
      Exibido como "Ref:MM/AAAA" (`formatarReferencia`, novo helper em `consultor/tipos.ts`) numa
      coluna nova, e a coluna de data mudou de ISO (`AAAA-MM-DD`) pra BR (`DD/MM/AAAA`, novo
      helper `formatarDataBr`) — nas duas telas espelhadas (Consultor + Gestor) e no PDF
      (helpers locais equivalentes em `lib/relatorios/consultor.ts`, mesmo padrão já usado em
      `pdf.ts`). Meses já apurados antes dessa mudança mostram "—" na referência até serem
      gerados de novo (mesmo comportamento já visto antes com `dt_pagamento`/`placasAtivadas`
      quando esses campos foram adicionados).

### 6.20 Bug financeiro real: recorrência de placa de OUTRO consultor creditada no boleto compartilhado (07/08/2026)
- [x] **Achado comparando com um relatório oficial do Ileva** — o cliente forneceu a apuração de
      julho/2026 do consultor #9 direto do Ileva (150 itens, R$3.371,75) pra validar contra o
      nosso sistema, que mostrava 152 itens/R$3.433,75. Comparação boleto a boleto (`cod_cobranca`)
      mostrou que os **143 boletos eram exatamente os mesmos nos dois lados** — a diferença inteira
      (2 itens, R$62,00) vinha de 2 placas que apareceram no nosso `detalhe.recorrencias` do
      consultor #9 mas **não pertencem a ele**.
      - Causa raiz, distinta da seção 6.19 (que era o MESMO boleto reprocessado várias vezes pro
        MESMO consultor): aqui o boleto de Fechamento já era processado uma única vez (fix da
        6.19 funcionando certo), mas ao expandir `detalhe.veiculos` desse boleto, o código
        empurrava um item de recorrência pra **cada** veículo do boleto, sem checar se aquele
        veículo pertencia ao consultor sendo apurado. Boletos de Fechamento podem agrupar placas
        de consultores **diferentes** (família/conta com veículos vendidos por vendedores
        diferentes, faturados juntos) — o comentário antigo no código já citava esse caso
        ("nem sempre o veículo do boleto está na lista de veículos deste consultor"), mas só
        tratava como problema de nome em branco, não de atribuição indevida de valor.
      - Confirmado ao vivo na API do Ileva (`GET /veiculo/buscar`): placa QPA5C81 (R$15,00,
        boleto #37116) é do consultor **#78** (Santiago Damasceno Leles Silva); placa PQV5D58
        (R$47,00, boleto #37208) é do consultor **#8**. Nenhuma das duas é do consultor #9.
        R$15+R$47 = R$62,00, exatamente a diferença encontrada.
      - **Risco real**: como a apuração é gerada por consultor individualmente, o mesmo boleto
        também aparece na apuração do consultor dono da outra placa (#78/#8) — ou seja, esse
        valor corria risco de ser **pago em duplicidade** (uma vez pro consultor errado, e de
        novo pro dono real), não só uma diferença de exibição.
      - **Corrigido** em `mensal.ts`: antes de empurrar o item de recorrência de cada
        `veiculoDetalhe` do boleto expandido, checa `veiculoPorCodigo.has(veiculoDetalhe.cod_veiculo)`
        (o mapa dos veículos do PRÓPRIO consultor sendo apurado) e ignora o veículo se não for
        dele. O boleto continua sendo expandido normalmente pros veículos que realmente são do
        consultor. Como consequência, o fallback `|| boleto.nome_associado` pro nome do associado
        (que existia por causa desse mesmo cenário) deixou de ser necessário e foi removido —
        agora `veiculoPorCodigo.get(...)` sempre existe nesse ponto.
      - `npx tsc --noEmit`, `npm run lint` e `npm run build` confirmados limpos depois do fix.
      - **Pendente**: redeploy do Trigger.dev (mudou `mensal.ts`, dependência de `gerar-apuracao`).
        O Samuel vai gerar a apuração de julho/2026 manualmente pelo sistema pra revalidar contra
        o relatório do Ileva antes de decidir se outros meses/consultores precisam ser
        regenerados também.
