# Como gerar a chave de API de teste no Ileva (somente leitura)

Passo a passo para você gerar as credenciais, sem risco de alterar dados reais. Baseado no vídeo
"Como configurar Api ileva.mp4" + nos prints em `Print dos endpoints ileva/` + na documentação
oficial em `https://api.ileva.com.br/docs/oauth`.

## 1. Criar o usuário de API dedicado

1. No painel do Ileva, ir em **Usuários** → **Novo registro**.
2. Preencher nome/e-mail que identifique claramente o uso, ex.:
   `api-testes-sistema@protegeclub` (não usar o e-mail de uma pessoa real da equipe).
3. Definir uma senha só para esse usuário (vamos precisar dela no `.env`).
4. Em **Permissões → Permitir acesso via**: deixar **ligado só "API de integração"** (pode
   desligar "Sistema", esse usuário não precisa logar na tela).
5. Em **Grupo**: escolher **"Permissão customizada"**.
6. Nos módulos abaixo, marcar **apenas "Visualizar lista/interna"** (e "Gerar relatórios" quando
   existir a opção) — **não marcar Criar/Editar/Excluir em nada nesta fase**, para garantir que
   não há risco de alteração:

   - **Comercial**: Consultores, Consultores – Análise de Desempenho, Equipes, Indicadores, Planos,
     Benefícios, Indicações
   - **Gerenciamento de Associados**: Associados, Boletos, Dashboard Financeiro, Contas financeiro,
     Financeiro fechamento, Financeiro rateio, Veículos, Situação veículo associado
   - **Financeiro**: Lançamentos, Categoria, Centro de custo
   - **Relatórios dinâmicos**: Boletos, Veículos, Veículos por Período, Associados, Benefícios

7. Descer até o final da tela e clicar em **Salvar**.

## 2. Gerar a App Key

1. Ir em **Configurações → Integrações → App Key**.
2. Clicar em **Adicionar**.
3. Descrição: algo como `"Testes API - sistema de apuração - somente leitura"`.
4. Definir uma **data de expiração** (recomendo 30 dias — assim, se for esquecida, expira sozinha
   em vez de ficar uma chave solta ativa indefinidamente).
5. Salvar. A tela vai mostrar o **App Key** — copiar esse valor.

## 3. O que me enviar

Depois de criar o usuário e a App Key, me envie (de preferência colando direto no `.env` que já
deixei preparado — ver abaixo — e não aqui no chat, já que fica salvo na conversa):

- `ILEVA_APP_KEY` — a App Key gerada no passo 2
- `ILEVA_API_USERNAME` — o e-mail/usuário criado no passo 1
- `ILEVA_API_PASSWORD` — a senha definida no passo 1

Com isso eu consigo autenticar em `POST https://api.ileva.com.br/oauth/token` (header `app_key` +
body `username`/`password`) e começar a testar os endpoints de leitura mapeados em
`docs/api-ileva/ENDPOINTS.md`, sem nenhum risco de escrever em dados reais — porque esse usuário
não tem nenhuma permissão de Criar/Editar/Excluir.

> Lembrete: o token gerado é único por usuário — cada novo login invalida o token anterior desse
> mesmo usuário. Não é um problema para nós (só um usuário de API sendo usado por vez), mas evite
> logar esse mesmo usuário em dois lugares ao mesmo tempo durante os testes.

## 4. Fazendo o mesmo no Omie (sandbox oficial)

Não depende dessas permissões — é só:
1. Logar na conta real do Omie do cliente.
2. Ir em **Meus Aplicativos** → **"Novo teste grátis"**.
3. Copiar o **App Key** e **App Secret** gerados para esse aplicativo de teste.
4. Me enviar como `OMIE_APP_KEY` e `OMIE_APP_SECRET` no `.env`.
