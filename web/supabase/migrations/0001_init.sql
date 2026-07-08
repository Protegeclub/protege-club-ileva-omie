-- Migration inicial do sistema de apuração de comissões (Protege Club).
-- Aplicar com `supabase db push` (ou colando no SQL Editor do painel Supabase) depois que o
-- projeto Supabase existir e as credenciais estiverem em web/.env.local.

create type perfil_tipo as enum ('gestor', 'comercial', 'consultor');

-- Um registro por usuário do sistema (não confundir com "associado" do Ileva).
create table perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  perfil perfil_tipo not null,
  cod_consultor integer, -- obrigatório quando perfil = 'consultor'; vincula ao Ileva
  criado_em timestamptz not null default now()
);

alter table perfis enable row level security;

create policy "usuario ve o proprio perfil"
  on perfis for select
  using (auth.uid() = user_id);

-- Listagens administrativas (Gestor/Comercial vendo todos os perfis) devem ser feitas em Route
-- Handlers usando a service role key no servidor, não direto do client — não criamos uma policy
-- de "gestor vê tudo" aqui pois exigiria checar o próprio papel dentro da policy (risco de
-- recursão); mais simples e mais seguro resolver isso na camada de aplicação.

-- Cache local de token da API do Ileva, compartilhado entre instâncias serverless (ver nota em
-- src/lib/ileva/client.ts sobre o token único por usuário do Ileva).
create table ileva_token_cache (
  id int primary key default 1,
  access_token text not null,
  expira_em timestamptz not null,
  atualizado_em timestamptz not null default now(),
  constraint singleton check (id = 1)
);

alter table ileva_token_cache enable row level security;
-- Sem policies de select/insert/update: só acessível via service role key (uso interno do
-- backend), nunca pelo client.

-- Fechamento mensal consolidado por consultor. Os valores são calculados a partir dos dados do
-- Ileva (ver docs/api-ileva/ENDPOINTS.md) no momento da geração — não são espelho em tempo real.
create table apuracoes_mensais (
  id uuid primary key default gen_random_uuid(),
  cod_consultor integer not null,
  ano int not null,
  mes int not null,
  total_adesao numeric(12, 2) not null default 0,
  total_recorrencia numeric(12, 2) not null default 0,
  total_desconto_rastreador numeric(12, 2) not null default 0,
  total_premiacao_individual numeric(12, 2) not null default 0,
  total_premiacao_equipe numeric(12, 2) not null default 0,
  total_liquido numeric(12, 2) not null default 0,
  gerado_por uuid references auth.users (id),
  gerado_em timestamptz not null default now(),
  unique (cod_consultor, ano, mes)
);

alter table apuracoes_mensais enable row level security;

create policy "consultor ve a propria apuracao"
  on apuracoes_mensais for select
  using (
    cod_consultor = (select cod_consultor from perfis where user_id = auth.uid())
  );

-- Gestor/Comercial acessam via service role key no servidor (mesma lógica de `perfis` acima).

-- Log de auditoria da criação de Conta a Pagar na Omie — uma linha por tentativa, com o código
-- de integração usado para evitar duplicidade em reprocessamento (ver
-- src/lib/omie/client.ts e CONTEXTO_E_CHECKLIST.md, seção 6.5).
create table auditoria_omie (
  id uuid primary key default gen_random_uuid(),
  apuracao_id uuid references apuracoes_mensais (id),
  cod_consultor integer not null,
  codigo_integracao text not null unique,
  valor numeric(12, 2) not null,
  status text not null default 'pendente', -- pendente | enviado | erro
  retorno_omie jsonb,
  criado_por uuid references auth.users (id),
  criado_em timestamptz not null default now()
);

alter table auditoria_omie enable row level security;
-- Só acessível via service role key (gerado e consultado pelo backend/painel do Gestor).

-- PLACEHOLDER especulativo — estrutura provável para o plano de carreira, mas as faixas e
-- valores reais ainda não foram definidos pelo cliente (ver docs/REQUISITOS.md, seção 3, e
-- CONTEXTO_E_CHECKLIST.md, seção 6.1). Ajustar ou recriar esta tabela quando as regras chegarem.
create table plano_carreira_niveis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  min_placas int not null,
  max_placas int, -- null = sem limite superior
  bonificacao_individual numeric(12, 2) not null,
  bonificacao_equipe numeric(12, 2),
  ativo boolean not null default true
);

alter table plano_carreira_niveis enable row level security;

create policy "qualquer usuario autenticado le os niveis do plano de carreira"
  on plano_carreira_niveis for select
  using (auth.role() = 'authenticated');
