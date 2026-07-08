# Requisitos — Sistema de Apuração de Comissões (Protege Club)

> Documento consolidado a partir da reunião "Como sistema deve ser.mp4", do vídeo
> "Como configurar Api ileva.mp4", do site institucional (protegeclub.com.br) e de
> pesquisa pública sobre as APIs do Ileva e da Omie. Este é um ponto de partida para
> validarmos juntos antes de definir a arquitetura.

## 1. Contexto do cliente

- **Cliente**: Protege Club — associação de proteção veicular (carros e motos), sede em Rio Verde (GO).
- **Produto**: proteção veicular (furto/roubo, colisão, fenômenos naturais, perda total, vidros,
  rastreamento), com benefícios adicionais (carro reserva, APP, auxílio funeral, auxílio pet,
  telemedicina, assistência residencial, assistência 24h).
- **Canal de venda**: rede de consultores/produtores externos (hoje ~60–70 cadastrados) que
  captam associados e acompanham o ciclo de vida deles na associação.
- **Observação organizacional**: a empresa-mãe também administra a Auto América (outra associação),
  mas esta reunião e este sistema são especificamente sobre a **Protege Club**.

## 2. Sistemas atuais e seus papéis

| Sistema | Papel hoje | API |
|---|---|---|
| **Ileva** | Gestão da associação: app comercial (adesão/cadastro de associado e veículo), emissão de boleto, integração bancária (retorno de pagamento), vínculo consultor↔placa, é a **única fonte** do valor de "assistência profissional" (comissão de recorrência) | Privada, por usuário de API com permissões customizadas (ver seção 5) |
| **Omie** | Financeiro: contas a pagar, contas a receber, conciliação. Título a pagar do consultor hoje é criado **manualmente, um por um** | Pública, mais simples de acessar |
| **Excel / Power BI** | Fechamento mensal manual da apuração de comissão; o Power BI existente é uma versão gratuita, feito por um ex-colaborador, **sem exportação de relatórios** | — |

Fluxo de pagamento hoje: Ileva emite o boleto → integra com a Omie criando uma conta a receber →
quando o banco confirma pagamento (via API bancária no Ileva), o Ileva dá baixa e também baixa na Omie.
Ou seja, a confirmação de pagamento existe nos dois sistemas, mas o **detalhe da comissão de
recorrência só existe no Ileva**.

## 3. Modelo de comissionamento dos consultores

O consultor tem três fontes de ganho, apuradas mensalmente:

1. **Adesão** — taxa cobrada na venda inicial. Fica 100% com o consultor.
   - ~99% dos consultores retêm essa taxa diretamente do associado.
   - ~1% (fluxo minoritário) manda o valor para a Protege Club, que repassa depois — esse caso
     precisa aparecer separado na apuração.
2. **Recorrência ("assistência profissional")** — embutida na mensalidade do associado, é a
   comissão recorrente do consultor por continuar acompanhando o associado (sinistros, assistência).
   - Sugerido não passar de ~10% do valor da mensalidade, mas o consultor pode negociar mais —
     a empresa não bloqueia.
   - **Só é repassada depois que o boleto da mensalidade do associado for pago** (baixa confirmada).
   - É o dado que **só existe detalhado no Ileva**.
3. **Plano de carreira** — bonificação por volume de "placas" (veículos) vendidas no mês, com
   possibilidade de subir de nível e ganhar também uma bonificação de equipe. As regras completas
   do plano de carreira ainda não foram detalhadas nesta reunião — **precisa de reunião específica
   com o comercial para mapear as faixas/níveis**.

**Dedução**: veículos com valor acima de R$ 80.000 recebem instalação de rastreador; o custo
(hoje R$ 100) é **descontado da apuração do consultor**, pois é responsabilidade dele.

### Fechamento mensal (o que o sistema precisa calcular por consultor)
- Total de adesões do mês (com lista detalhada das placas/associados).
- Total de recorrência do mês (associados que pagaram a mensalidade, com valor por placa).
- Desconto de instalação de rastreador (lista de placas afetadas).
- Premiação individual do plano de carreira (por volume de placas).
- Premiação de equipe (se aplicável).
- Carteira de inadimplentes do consultor: quem está em atraso e **quanto o consultor ganharia de
  recorrência se conseguisse cobrar** — usado para estimular o consultor a atuar como cobrador.

## 4. Perfis de acesso

| Perfil | Acesso |
|---|---|
| **Gestor** | Total — todos os consultores, todo o financeiro, toda a apuração |
| **Comercial** | Equivalente ao gestor em consultores/apuração, mas **sem financeiro**. É quem efetivamente "clica para gerar" o relatório de apuração mensal |
| **Consultor** | Só os próprios dados: adesões, recorrência, descontos, inadimplência da própria carteira, premiação |

## 5. Integração técnica

### Ileva
- API privada; acesso via **usuário de API dedicado** — passo a passo em
  `docs/api-ileva/COMO_GERAR_CHAVE_API.md`:
  1. Criar um usuário no Ileva com acesso via "API de integração" e um grupo de permissão
     customizado (as permissões seguem os mesmos módulos que os endpoints da API expõem).
  2. Gerar uma **App Key** em Configurações → Integrações → App Key (com ou sem expiração).
  3. Autenticar via `POST /oauth/token` (header `app_key` + body `username`/`password`) → retorna
     `access_token` (Bearer, expira em 24h) para consumir os demais endpoints, restritos às
     permissões concedidas ao usuário. Token é único por usuário — novo login invalida o anterior.
- Hoje a empresa já usa endpoints do Ileva para automação de WhatsApp e consulta de placa (só no
  app mobile).
- Vantagem do Ileva sobre a Omie: o vínculo consultor↔placa é **obrigatório e automático**, então é
  a fonte mais confiável para identificar o consultor responsável por cada associado/veículo.

#### Endpoints confirmados (spec OpenAPI real, lida em `api.ileva.com.br/docs/*`)

Referência completa em **`docs/api-ileva/ENDPOINTS.md`**. O risco de "endpoints financeiros/de
associado não existirem" está **resolvido** — a API real (não só a tela de permissões) expõe:

- `GET /consultor/listar|buscar`, `/equipe/listar`, `/indicador/listar` — consultor e equipe.
- `GET /veiculo/listar|buscar` — com `cod_consultor` e **`possui_rastreador`** como campos/filtros
  nativos, e `beneficios[]` (com `cod_beneficio`, `beneficio_calculo` incluindo
  `porcentagem_vlmensalidade` — provável forma como a "assistência profissional" é modelada).
- `GET /cobranca/buscar|listar` — boleto com `situacao` (`Liquidado` = pago) e, por veículo dentro
  do boleto, um array `lancamentos[]` com `cod_beneficio` e `valor`: **é aqui que o valor da
  comissão de recorrência por placa paga deve estar**.
- `GET /beneficio` — para achar o `cod_beneficio` exato da "Assistência Profissional" e do
  "Rastreador".
- `GET/PUT /lancamento/*` — lançamentos financeiros gerais.

Não existe endpoint chamado "comissão" ou "plano de carreira" — como esperado, isso é regra de
negócio nossa, calculada a partir de Consultor + Veículo + Boleto/Lançamentos + Benefício.

### Omie
- API pública, mais simples de integrar (REST/JSON ou SOAP, autenticação por chave de app).
- Hoje o vínculo consultor↔título é **manual** (campo digitado à mão) e às vezes fica sem
  consultor vinculado — não é confiável como fonte única para isso.
- Objetivo do cliente: usar a API da Omie para **criar automaticamente o título a pagar** de cada
  consultor após o fechamento mensal, eliminando o lançamento manual um a um.

### Estratégia sugerida (a validar)
Usar o **Ileva como fonte de verdade** para vínculo consultor↔associado↔veículo e valores de
recorrência/adesão, e a **Omie como fonte de verdade financeira** (conciliação de pagamento e
criação do título a pagar). O novo sistema centraliza, cruza e apura os dois, e expõe isso nas
telas por perfil.

## 6. Funcionalidades identificadas na demonstração (tela do consultor)

- Visão por consultor, filtrável por ano/mês.
- Cards: total de adesões (individual + equipe), premiação individual e de equipe, resumo de
  recorrência, desconto de rastreador, carteira de inadimplentes.
- Cada card é clicável e abre a lista detalhada (placas/associados por trás do número).
- **Exportação em PDF**: (a) relatório individual do consultor, próximo ao que é hoje enviado
  manualmente por e-mail/WhatsApp, porém um pouco mais objetivo, direto ao ponto e com a lista de placas anexada; (b)
  relatório de totalização geral.
- Cadastro de associado/veículo **não é feito neste sistema** — continua no app comercial do
  Ileva; o novo sistema só consome esses dados.

## 7. Riscos e dependências

1. ~~Confirmar na prática qual `cod_beneficio` corresponde à "Assistência Profissional"~~ —
   **validado** com dados reais em 05/07/2026: `cod_beneficio 65` (+ variantes 66/110/121), valor
   aparece em `lancamentos[]` de `GET /cobranca/buscar` por boleto pago. Ver
   `docs/api-ileva/ENDPOINTS.md`. Ponto ainda aberto: **onde é lançado o custo de instalação do
   rastreador (R$100)** — não aparece em nenhum benefício mapeado, precisa perguntar ao cliente.
2. **Regras completas do plano de carreira** (níveis, faixas, bonificação de equipe) não foram
   detalhadas — precisa de reunião com o comercial ou documento do plano.
3. Casos de exceção no fluxo de adesão (os ~1% de consultores que não retêm a taxa diretamente)
   precisam de tratamento separado na apuração. (obs sobre isso, nao faremos nada sobre esses consultores ainda.)
4. Consistência de dados entre Ileva e Omie (ex.: título criado na Omie sem consultor vinculado)
   precisa de rotina de validação/alerta antes do fechamento.
5. Entender o que já existe em **Aplicativo → Solicitações de saque / Pagamentos realizados** no
   Ileva antes de desenhar o fluxo de pagamento do novo sistema — pode já cobrir parte do controle
   de repasse e evitar retrabalho.

## 8. Perguntas abertas para validar com o cliente

- Quais faixas/níveis exatos compõem o plano de carreira e como a bonificação de equipe é calculada?
- O sistema deve **criar automaticamente** o título a pagar na Omie, ou apenas gerar os dados para
  conferência antes da criação (dado o histórico de erros de vínculo)?
- Qual a política para o consultor que negocia recorrência acima dos ~10% — o sistema deve
  permitir edição manual desse percentual por consultor/contrato?
- O card de inadimplentes deve apenas informar o consultor, ou também permitir que ele registre
  um contato/ação de cobrança pelo próprio sistema?
- Quem faz a validação final antes de disparar o pagamento — Comercial, Gestor, ou os dois em
  conjunto (dupla checagem)?

## 9. Próximos passos sugeridos

1. Validar este documento com o cliente (ou internamente, se você preferir revisar antes).
2. Gerar a API key de teste só-leitura no Ileva (`docs/api-ileva/COMO_GERAR_CHAVE_API.md`) e no
   Omie (sandbox oficial) e validar com dados reais os endpoints já mapeados em
   `docs/api-ileva/ENDPOINTS.md` (em especial o `cod_beneficio` da Assistência Profissional).
3. Definir stack técnica (frontend/backend, hospedagem Vercel, banco Supabase) e desenhar o
   modelo de dados (associados, veículos, consultores, apurações mensais, lançamentos).
4. Desenhar as telas por perfil (Gestor / Comercial / Consultor) a partir do que já existe no
   Power BI, mas com exportação em PDF nativa.
