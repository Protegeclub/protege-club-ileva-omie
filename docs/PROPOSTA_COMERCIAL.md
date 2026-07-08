# Proposta Comercial — Sistema de Apuração de Comissões

**Para:** Protege Club
**Sobre:** Desenvolvimento de sistema web para apuração de comissões de consultores, com
integração aos sistemas Ileva e Omie.

---

## 1. Contexto

Hoje o fechamento mensal de comissões dos consultores é feito manualmente (planilhas Excel + um
painel de Power BI limitado, sem exportação de relatórios), cruzando dados do Ileva e da Omie à
mão. Esta proposta cobre o desenvolvimento de um sistema web que automatiza esse fechamento,
substitui as planilhas e centraliza a informação num único lugar, acessível por três perfis
diferentes.

## 2. Escopo do sistema

### 2.1 Três níveis de acesso

- **Gestor** — acesso total: todos os consultores, toda a apuração, todo o financeiro.
- **Comercial** — acesso a consultores e apuração (é quem gera o fechamento mensal), sem acesso
  ao financeiro.
- **Consultor** — acesso individual: acompanha apenas os próprios números.

### 2.2 Painel do Consultor

- Visão mensal/anual com total de adesões (individual e de equipe).
- Premiação individual e de equipe (plano de carreira).
- Resumo de recorrência do mês (comissão sobre mensalidades pagas).
- Desconto de instalação de rastreador, detalhado por placa.
- Carteira de inadimplentes: quem está em atraso e quanto o consultor receberia se conseguir
  cobrar.
- Cada card com detalhamento (lista de placas/associados por trás do número).

### 2.3 Painéis de Comercial e Gestor

- Geração do fechamento mensal de apuração para todos os consultores.
- Conferência dos valores antes do repasse.
- (Gestor) Visão financeira consolidada.

### 2.4 Relatórios em PDF

- Relatório individual por consultor (resumo + lista de placas).
- Relatório de totalização geral do mês.

### 2.5 Integrações

- **Ileva**: consulta de consultores, equipes, veículos (vínculo com consultor, rastreador) e
  boletos/benefícios (para apurar adesão e recorrência automaticamente).
- **Omie**: criação automática do título a pagar de cada consultor após o fechamento mensal,
  eliminando o lançamento manual um a um.

### 2.6 Fora do escopo desta proposta

- Cadastro de associados/veículos (continua sendo feito no app comercial do Ileva).
- Definição fina das regras do plano de carreira (níveis/faixas) — depende de detalhamento do
  comercial do cliente; o sistema será construído para acomodar essas regras assim que definidas.

## 3. Prazo

Estimativa de **10 a 15 dias** para a entrega da v1 completa (incluindo integração com
Ileva e Omie), a partir da aprovação desta proposta e do acesso às credenciais necessárias. O
prazo pode variar conforme a velocidade de resposta nas validações e definição das regras do plano
de carreira.

## 4. Investimento

| Item | Valor |
|---|---|
| Desenvolvimento do sistema (v1 completa, conforme escopo acima) | **R$ 2.000,00** |
| Manutenção e suporte mensal (a partir da entrega) | **R$ 300,00/mês** |

### Por que a manutenção mensal é necessária

O sistema depende de duas integrações externas (Ileva e Omie) que podem mudar sem aviso — um
endpoint alterado ou uma permissão modificada pode quebrar parte do fechamento mensal. Além disso,
todo sistema em produção precisa de ajustes, correções e pequenas melhorias contínuas. A
manutenção mensal cobre:

- Hospedagem e monitoramento do sistema.
- Correção de bugs e ajustes de comportamento.
- Adaptação a mudanças nas APIs do Ileva/Omie.
- Pequenos ajustes de regras (ex.: mudança numa faixa do plano de carreira).

Funcionalidades novas de maior porte fora do escopo original serão orçadas separadamente.

## 5. Próximos passos

1. Aprovação desta proposta.
2. Confirmação das regras completas do plano de carreira junto ao comercial.
3. Liberação das credenciais de API (Ileva já em teste; Omie a confirmar).
4. Início do desenvolvimento.

---

*Proposta válida por 15 dias a partir da data de envio.*
