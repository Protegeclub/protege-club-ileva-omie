-- Rastreia o status de cada geração de apuração disparada em segundo plano (Trigger.dev) —
-- separado de apuracoes_mensais de propósito: essa tabela só existe quando o resultado final já
-- foi calculado e é válido; misturar um status "pendente/processando" nela criaria linhas com
-- valores zerados que o painel do Consultor/Gestor confundiria com "gerado, mas zero".
create type apuracao_job_status as enum ('pendente', 'processando', 'concluido', 'erro');

create table apuracao_jobs (
  id uuid primary key default gen_random_uuid(),
  cod_consultor integer not null,
  ano int not null,
  mes int not null,
  status apuracao_job_status not null default 'pendente',
  erro_mensagem text,
  trigger_run_id text,
  solicitado_por uuid references auth.users (id),
  solicitado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (cod_consultor, ano, mes)
);

create index apuracao_jobs_periodo_idx on apuracao_jobs (ano, mes);

alter table apuracao_jobs enable row level security;
-- Sem policies de select/insert/update: só acessível via service role key (painel Comercial
-- dispara e consulta o status; a tarefa em segundo plano atualiza ao terminar).
