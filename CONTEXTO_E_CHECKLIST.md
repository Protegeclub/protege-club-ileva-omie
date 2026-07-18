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

**Pergunta em aberto pro cliente (achada em 12/07/2026, dado real do teste de stress)**: líquido
= adesão + recorrência − desconto de rastreador, sem piso em zero — então dá pra um consultor
fechar o mês com **líquido negativo** se vender veículo(s) com rastreador mas não tiver
adesão/recorrência suficiente no mesmo mês pra cobrir o desconto (casos reais: consultor #69
Laura Vitoria, -R$100 em 06/2026; consultor #80 André Gouveia, -R$90 em 06/2026). Ainda não
decidido com o cliente o que deveria acontecer nesse caso: (1) mostrar negativo mesmo (é o que o
sistema faz hoje), (2) zerar (a associação absorve o prejuízo daquele mês), ou (3) carregar o
saldo negativo pro mês seguinte, abatendo do próximo líquido positivo.

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
- [ ] Identificar em produção qual variante de "Assistência Profissional" cada plano/regional usa
      (65 confirmado funcionando; 66/110/121 ainda não vistos em dado real)
- [ ] Rotina periódica de atualização (cron/job) em vez de gerar manualmente pelo Gestor

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
      **Bug real corrigido (12/07/2026)**: mostrava só o boleto mais antigo em atraso por
      veículo, escondendo atrasos empilhados. Agora lista todos — validado com caso real
      (consultor 11, veículo 2740: 3 boletos em aberto, dez/2025 a mai/2026).
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
- [ ] Validação prática com o cliente (comparar com o fechamento manual de um mês já apurado)
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
