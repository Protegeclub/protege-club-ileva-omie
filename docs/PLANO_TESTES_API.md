# Plano de testes seguros — API Omie e API Ileva

> Objetivo: mapear e validar os endpoints das duas plataformas sem qualquer risco de alterar dados
> reais do Protege Club, que já está ativo e operando nas duas.

## 1. Omie — usar o sandbox oficial (dados fictícios, zero risco)

O Omie tem um ambiente de teste isolado, pronto para uso. Passo a passo:

1. Logar na conta real do Omie do cliente (Protege Club).
2. Ir em **Meus Aplicativos** (portal do desenvolvedor / configurações de integrações).
3. Clicar em **"Novo teste grátis"** → isso cria um "Aplicativo Teste de Demonstração" com uma
   empresa e dados fictícios, totalmente separado da base real.
4. Copiar o **App Key** e **App Secret** gerados para esse aplicativo de teste (são diferentes das
   credenciais de produção).
5. Validade padrão: **7 dias**. Se precisar de mais tempo, pedir extensão para
   `ajuda@omie.com.br`.
6. Usar essas credenciais de teste no ambiente de desenvolvimento (`.env.test`/`.env.local`) para
   validar:
   - Autenticação (App Key + App Secret).
   - Consulta de clientes/fornecedores, contas a pagar/receber, categorias, departamentos.
   - **Criação de título a pagar** (o fluxo mais sensível — é exatamente o que vamos automatizar).
7. **Nunca** usar o App Key/Secret de produção durante o desenvolvimento. Só trocar para produção
   depois que o fluxo estiver 100% validado no sandbox, e mesmo assim, testar a primeira criação
   real de título com acompanhamento do cliente.

## 2. Ileva — sem sandbox público; testar com segurança na conta real

Não há um ambiente de homologação self-service documentado publicamente para o Ileva. A
recomendação é: **perguntar ao suporte deles se existe/pode ser criado um ambiente de testes**
(vale a pergunta, principalmente por ser um cliente ativo com projeto de integração em andamento).
Enquanto isso não vem, dá para testar com segurança na conta real, porque o Ileva separa a
permissão de **leitura** da permissão de **escrita** por módulo — então um usuário de API
só-leitura não tem como alterar nada.

### 2.1 Criar o usuário de API dedicado (fase de leitura)

Seguindo o vídeo "Como configurar Api ileva":

1. Criar um usuário novo (não vincular a uma pessoa real da equipe), ex.:
   `api-integracao-testes@protegeclub`.
2. Em Permissões: ligar **"API de integração"**, desligar "Sistema" (não precisa logar na UI).
   Grupo: **Permissão customizada**.
3. Nos módulos abaixo (mapeados a partir dos prints de permissão), marcar **apenas**
   "Visualizar lista/interna" e "Gerar relatórios" onde existir — **não marcar Criar/Editar/Excluir
   em nenhum módulo nesta fase**:

   | Área | Módulos a marcar (somente leitura) |
   |---|---|
   | Comercial | Consultores, Consultores – Análise de Desempenho, Equipes, Indicadores, Planos, Benefícios, Indicações |
   | Gerenciamento de Associados | Associados, Boletos, Dashboard Financeiro, Contas financeiro, Financeiro fechamento, Financeiro rateio, Veículos, Situação veículo associado |
   | Financeiro | Lançamentos, Categoria, Centro de custo |
   | Relatórios dinâmicos | Boletos, Veículos, Veículos por Período, Associados, Benefícios |
   | Aplicativo | Solicitações de saque, Pagamentos realizados |

4. Salvar o usuário.
5. Ir em **Configurações → Integrações → App Key** → Adicionar → definir uma descrição clara
   (ex.: "Testes API — sistema de apuração — expira em 30 dias") e uma **data de expiração** (para
   não esquecer um token só-leitura solto por aí).
6. Autenticar no Swagger via `POST /Authenticacao` com App Key + usuário/senha desse usuário de
   teste → guardar o token.

### 2.2 Sanity check antes de confiar no ambiente

Antes de explorar tudo, fazer **um teste único**: tentar um `POST`/`PUT` qualquer com esse token
(algo pequeno e reversível, ou mesmo um endpoint sem permissão nenhuma) e confirmar que a API
**rejeita** por falta de permissão. Isso confirma que a restrição é aplicada no servidor, não só
escondida na tela — só depois disso vale explorar os endpoints de leitura com tranquilidade.

### 2.3 Mapeamento (só leitura)

Com o token só-leitura, percorrer os endpoints dos módulos da tabela acima, salvando exemplos reais
de resposta (anonimizados se for expor fora da equipe) em `docs/ileva-api-samples/` — isso vira a
base do modelo de dados do novo sistema.

### 2.4 Quando precisar testar escrita

Só depois que o modelo de leitura estiver mapeado, e só se for estritamente necessário testar um
endpoint de escrita (ex.: "Adicionar débitos e créditos" em veículo, ou criação de um registro):

1. Criar **um** associado/veículo de teste, claramente identificado (ex.: nome
   "TESTE API — SISTEMA NOVO — NÃO USAR"), e restringir toda escrita a esse registro.
2. Avisar o time (Comercial/Gestor) antes, para não causar estranheza se algo aparecer na tela deles.
3. Nunca testar endpoints de "Alteração em massa" ou qualquer ação que afete múltiplos registros de
   uma vez.
4. Apagar/arquivar o registro de teste ao final.

### 2.5 Encerramento da fase de testes

Antes de ir para produção, revogar ou deixar expirar o App Key de testes e criar um usuário de API
definitivo com o **conjunto mínimo de permissões** de fato necessário para o sistema em produção
(princípio do menor privilégio) — incluindo, aí sim, as permissões de escrita que o sistema
realmente precisar usar (ex.: se o sistema for gerar algo no Ileva).
