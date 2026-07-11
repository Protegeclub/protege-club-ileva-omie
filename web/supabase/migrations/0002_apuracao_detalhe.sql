-- Guarda o detalhamento (placas por trás de cada total) junto do fechamento mensal, para o
-- drill-down nos cards do painel do consultor sem precisar reconsultar a API do Ileva.
alter table apuracoes_mensais
  add column detalhe jsonb not null default '{}'::jsonb;

comment on column apuracoes_mensais.detalhe is
  'Formato: { adesoes: AdesaoItem[], recorrencias: RecorrenciaItem[], veiculosComRastreador: VeiculoRastreadorItem[] } — ver web/src/lib/apuracao/mensal.ts';
