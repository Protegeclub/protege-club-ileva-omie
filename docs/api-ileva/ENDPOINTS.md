# Ileva — Endpoints confirmados (API real)

> Extraído diretamente da documentação pública da API em `https://api.ileva.com.br/docs/*`,
> lendo o spec OpenAPI que alimenta o Swagger de cada seção (`GET /api-doc?docName=<secao>`).
> Isso substitui a especulação anterior baseada só nos prints de permissão — agora temos o
> path, método e parâmetros reais de cada recurso. Specs brutos (OpenAPI JSON) salvos em
> `docs/api-ileva/specs/`.

Base URL: `https://api.ileva.com.br/`

## Autenticação (`oauth`)

- `POST /oauth/token`
  - Header: `app_key` (obtido em Ileva → Configurações → Integrações → API Integração)
  - Body (JSON): `username` (usuário/e-mail do Ileva), `password`, `two_fa` (opcional, se 2FA ativo)
  - Resposta 200: `{ access_token, token_type: "Bearer", expires_in: "86400" }` (24h)
  - Resposta 401: `{ status: 401, mensagem: "..." }`
  - Usar depois em todas as chamadas: header `Authorization: Bearer <access_token>`
  - **Importante**: token é único por usuário — gerar um novo invalida qualquer token anterior
    do mesmo usuário. Se o sistema tiver múltiplos processos usando a mesma API, o token deve
    ser gerenciado/cacheado de forma centralizada (não gerar um novo a cada chamada).

## Consultor / Equipe / Indicador (dentro do doc `lead`)

| Método | Path | Descrição |
|---|---|---|
| GET | `/consultor/listar` | Lista consultores (filtros: `cod_regional`, `cod_equipe`, paginação) |
| GET | `/consultor/buscar` | Busca consultor por `cod_consultor` ou `cpfCnpj` |
| POST | `/consultor` | Cadastra consultor |
| PUT | `/consultor/{cod_consultor}` | Atualiza consultor |
| GET | `/equipe/listar` | Lista equipes (paginação) |
| GET | `/indicador/listar` | Lista indicadores (filtro `cod_consultor`) |
| GET | `/indicador/buscar` | Busca indicador por código ou CPF |
| POST | `/indicador` | Cadastra indicador |

Campos do consultor: `cod_consultor`, `nome`, `email`, `telefone`, `cod_equipe`/`equipe`,
`cod_regional`/`regional`, `situacao` (Ativo/Inativo).

> "Indicador" parece ser um papel distinto de "Consultor" (talvez quem indica leads sem ser o
> consultor responsável pela venda) — **vale confirmar com o cliente** se indicador ≠ consultor
> no fluxo de comissão, ou se é irrelevante para a apuração.

## Lead / Origens / Planos (doc `lead`)

- `GET /lead/listar` — filtra por `cod_consultor`, `cod_equipe`, `cod_regional`, `placa`, datas de
  criação/ativação/vistoria. Cada lead tem `cod_associado_indicador`.
- `POST /lead/inserir`, `PUT /lead/{cod_lead}` — criação/atualização (cadastro continua feito
  pelo app comercial do Ileva, não precisamos escrever aqui).
- `POST /lead/vincular-beneficio` / `POST /veiculo/desvincular-beneficio` — vincula/desvincula um
  **benefício do tipo comercial** a um lead/veículo. É provavelmente aqui que a "assistência
  profissional" (comissão de recorrência) é configurada por venda.
- `GET /lead/origens`, `/lead/planos`, `/lead/marcas`, `/lead/anos`, `/lead/modelos`,
  `/lead/regionais`, `/lead/etapas-funil` — dados de apoio (cadastro/FIPE).

## Associado (doc `associado`)

| Método | Path | Descrição |
|---|---|---|
| GET | `/associado/buscar` | Por `cod_associado` ou `cpf_cnpj` |
| GET | `/associado/listar` | Paginado, filtros `cod_situacao`, `cod_conta` |
| PUT | `/associado/{cod_associado}` | Atualiza associado |

## Veículo (doc `veiculo`) — confirma o vínculo consultor↔placa e o rastreador

| Método | Path | Descrição |
|---|---|---|
| GET | `/veiculo/listar` | Filtros: **`cod_consultor`**, `cod_consultor_regional`, `cod_consultor_equipe`, **`possui_rastreador`**, `cod_associado`, `cod_beneficio`, `cod_situacao`, `mostrar_beneficios` |
| GET | `/veiculo/buscar` | Por `cod_veiculo`, `chassi` ou `placa` |
| GET | `/veiculo/listar-beneficios` | Lista benefícios que podem ser vinculados a veículos |
| GET | `/veiculo/listar-situacoes` | Situações possíveis do veículo |
| GET | `/veiculo/alteracoes-situacao` | Histórico de mudanças de situação, filtrável por data |
| PUT | `/veiculo/{cod_veiculo}` | Atualiza veículo |

Campos-chave confirmados no schema `veiculo`:
- `cod_consultor`, `consultor_nome`, `cod_consultor_regional`, `cod_consultor_equipe` — **o vínculo
  consultor↔placa é nativo e filtrável direto no endpoint**, exatamente como esperado pela reunião.
- `possui_rastreador`: `"Sim" | "Não"` — **dá para filtrar direto quem tem rastreador instalado**,
  sem precisar inferir pelo valor do veículo (>R$80mil).
- `valor_fipe`, `valor_protegido` — para cruzar com a regra dos R$80mil.
- `beneficios[]` (quando `mostrar_beneficios=1`): `cod_beneficio`, `beneficio_nome` (ex.:
  `"Rastreador"`), `beneficio_valor`, **`beneficio_calculo`** (enum: `fixo`, `porcentagem`,
  `porcentagem_vlmensalidade`, `dinamico`, etc.), `beneficio_tipo` (`plano` | `comercial`).
  **`porcentagem_vlmensalidade` é quase certamente como a "assistência profissional" (10% da
  mensalidade) é modelada** — precisa confirmar o nome exato do benefício com o cliente/Ileva.

## Cobrança / Boleto (doc `cobranca`) — aqui está o dado de pagamento + comissão por placa

| Método | Path | Descrição |
|---|---|---|
| GET | `/cobranca/buscar` | Por `nosso_numero` ou `cod_cobranca` — **retorna o detalhamento por veículo, incluindo `lancamentos[]`** |
| GET | `/cobranca/listar-associado-veiculo` | Paginado, filtros: `situacao_boleto`, datas de vencimento/pagamento/criação, `cod_veiculo`, `cpf_associado`, `placa` |
| GET | `/cobranca/listar` | Paginado, filtros `situacao`, `cod_veiculo`, `cod_associado` |
| GET | `/cobranca/listar-tipos` | Tipos de boleto cadastrados |

Campos-chave do boleto: `situacao` (`Aberto`, `Liquidado`, `Cancelado`, `Liquidado com desconto`,
`Excluido`, `Outra`), `dt_pagamento`, `valor_pagamento`, `dt_vencimento`.

**O mais importante**: `GET /cobranca/buscar` retorna, por veículo dentro do boleto, um array
`lancamentos[]` com `tipo` (ex.: `credito`), `descricao` (ex.: `"Mensalidade"`), **`cod_beneficio`**
e `valor`. **Esse é o caminho concreto para extrair o valor da "assistência profissional" por
boleto pago** — basta cruzar o `cod_beneficio` do lançamento com o benefício de recorrência do
consultor. Isso resolve o requisito "só repassar depois que o boleto for pago": filtrar
`situacao_boleto=Liquidado` e somar os lançamentos do benefício de comissão.

## Lançamentos financeiros (doc `lancamento`)

| Método | Path | Descrição |
|---|---|---|
| GET | `/lancamento/listar` | Filtros `fluxo` (entrada/saída) e `liquidado` |
| GET | `/lancamento/buscar` | Por `cod_lancamento` |
| PUT | `/lancamento/alterar/{cod_lancamento}` | Altera lançamento |

Mais genérico que o financeiro do boleto — provavelmente usado para o fluxo de caixa geral da
associação, não por veículo/consultor. Vale mapear na prática se sobrepõe ou complementa os
lançamentos de `/cobranca/buscar`.

## Benefícios (doc `beneficio`)

| Método | Path | Descrição |
|---|---|---|
| GET | `/beneficio` | Lista benefícios (filtros `cod_plano`, `plano_tipo_veiculo`, `integracao`) |
| GET | `/beneficio/{cod_beneficio}` | Detalha um benefício |
| POST | `/beneficio` | Cria benefício |
| POST | `/beneficio/vincular-plano` | Vincula benefício a um plano |

Usar `GET /beneficio` para achar o `cod_beneficio` exato da "Assistência Profissional" e do
"Rastreador" antes de programar o cálculo da apuração.

## Eventos / Ordem de compra (docs `evento`, `ordem-compra`) — sinistros e custos

- `/evento/*`, `/envolvido/*`, `/regulagem/*` — ciclo de sinistro (colisão, assistência) mencionado
  na reunião. Não é o foco da apuração de comissão, mas pode ser relevante se o consultor também
  acompanha esses casos.
- `/ordem/*` (Ordem de Compra de Evento e Avulsa), `/ordem/categoria`, `/ordem/centro-custo` —
  módulo financeiro de custos (ex.: pagamento da instalação do rastreador pode aparecer aqui como
  uma ordem de compra/categoria, e não como desconto direto — **vale confirmar com o cliente onde
  o custo do rastreador realmente é lançado hoje**).

## ✅ Validado com dados reais (usuário de API só-leitura, 05/07/2026)

Autenticação testada e funcionando (`POST /oauth/token`). Endpoints abaixo testados contra a base
real da Protege Club (245 consultores, ~3.800 veículos, ~30.900 boletos):

- **`GET /beneficio`** (paginar até 200) retorna 110 benefícios cadastrados. Os que interessam à
  apuração de comissão:
  - `cod_beneficio 65` — `"(e) Assistência Profissional"`, `calculo: dinamico` — **é este o
    benefício usado hoje nos veículos ativos** (confirmado em amostras reais).
  - `cod_beneficio 66` — `"Assistência Profissional (Apenas Uso Interno)"`, `dinamico`.
  - `cod_beneficio 110` — `"Assistência Profissional % (TESTE)"`, `calculo: porcentagem_vlmensalidade`,
    `valor: 10%` — variante nova, calculada como percentual da mensalidade (bate com o "~10%"
    citado na reunião), parece estar em teste.
  - `cod_beneficio 121` — `"(e) Assistência Profissional Senador Canedo"`, `porcentagem_vlmensalidade`,
    15% — variante regional.
  - `cod_beneficio 18/71` — `"Rastreamento"` (fixo, ~R$30) e `cod_beneficio 68` —
    `"Rastreamento Obrigatório"` (fixo, R$0 — parece ser só uma flag) são o **valor mensal do
    serviço de rastreamento**, não o custo de instalação de R$100 citado na reunião. **A dedução
    de R$100 pela instalação não aparece em nenhum benefício — precisa perguntar ao cliente onde
    isso é lançado hoje** (Ordem de Compra? Desconto manual no veículo?).

- **`GET /veiculo/listar?mostrar_beneficios=1`** confirmado: cada veículo carrega
  `cod_consultor`/`consultor_nome` nativos e um array `beneficios[]` com o valor **já negociado
  por veículo** (ex.: um veículo com `cod_beneficio 65` e `beneficio_valor: "15.00"` — o valor
  varia por contrato, não é fixo). Também confirmado `possui_rastreador: "Sim"/"Não"` direto no
  veículo, e que o nome do plano já embute a regra dos R$80mil (ex.:
  `"Protege Fácil Flex Acima de 80 Mil"` vs. `"...Abaixo de 80 Mil"`) — **o corte de R$80mil está
  no cadastro do plano, não precisa ser calculado a partir do `valor_fipe`.**

- **`GET /cobranca/buscar?cod_cobranca=X`** (a busca individual, não a listagem) é onde o valor
  realmente aparece **por boleto pago**: `boleto.veiculos[].lancamentos[]` traz cada benefício do
  mês com `cod_beneficio` e `valor`, incluindo a linha do 65 (Assistência Profissional) quando
  presente — exatamente o valor a repassar ao consultor **naquele mês, naquela placa**. A
  mensalidade recorrente tem `tipo_boleto: "Fechamento"` (não "Mensalidade" como a reunião sugeria
  informalmente) e `tipo_boleto: "Adesão"` para a taxa de entrada — **filtrar por esses dois
  valores de `tipo_boleto`**. Cada lançamento também pode ter `tipo: "tx_adm"` (taxa
  administrativa) e `tipo: "rateio"`, sem `cod_beneficio`.

- **Fluxo de apuração recomendado** (por consultor, por mês):
  1. `GET /veiculo/listar?cod_consultor=X&mostrar_beneficios=1` → placas do consultor.
  2. Para cada placa, `GET /cobranca/listar-associado-veiculo?cod_veiculo=Y&situacao_boleto=Liquidado`
     → boletos pagos no período, filtrando `tipo_boleto`.
  3. Para os boletos do tipo "Fechamento" (recorrência), `GET /cobranca/buscar?cod_cobranca=Z` →
     somar os `lancamentos[]` com `cod_beneficio` em `{65, 66, 110, 121}` (confirmar com o cliente
     se todos contam ou só o 65).
  4. Para os boletos do tipo "Adesão", o valor da taxa de adesão fica no topo do boleto/veículo
     (`valor`), não em `lancamentos[]` — a confirmar se o consultor retém 100% ou se aparece
     fracionado também.
  5. Cruzar `possui_rastreador` e o nome do plano (`nome_plano`) para aplicar a dedução da
     instalação — **local exato do lançamento desse custo ainda não identificado, perguntar ao
     cliente**.

- ⚠️ Consultor `cod_consultor` também pode ser a própria associação (ex.: um veículo apareceu com
  `consultor_nome: "Protegeclub"` — provavelmente uma "conta casa" para vendas sem consultor
  externo, ou o ~1% de casos onde a Protege Club retém e repassa depois, mencionado na reunião).
  Vale mapear esse `cod_consultor` específico e tratar como caso especial na apuração.

## Não encontrado explicitamente

- Nenhum endpoint com "comissão", "premiação" ou "plano de carreira" no nome — como suspeitado,
  isso é uma regra de negócio que vamos calcular no **nosso** sistema a partir de
  Consultor + Veículo + Boleto/Lançamentos + Benefício, não algo que o Ileva já expõe pronto.
- `Aplicativo → Solicitações de saque / Pagamentos realizados` (visto nos prints de permissão) não
  apareceu como doc separado no Swagger — pode estar dentro de outra seção não mapeada ainda
  (`outros`, `atendimento`, `rede-servico`) ou ser exclusivo do app mobile sem endpoint de API.
  Vale mapear esses três docs restantes quando formos aprofundar.
