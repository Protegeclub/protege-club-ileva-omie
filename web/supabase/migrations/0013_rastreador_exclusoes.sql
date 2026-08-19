-- Exclusão manual de desconto de rastreador (pedido do cliente, 18/08/2026): alguns consultores
-- não devem ser cobrados por um veículo específico. Guardada por cod_veiculo (não por
-- ano/mes) porque dt_contrato de um veículo é fixo — o desconto dele só cai numa única
-- competência, então excluir por veículo já cobre qualquer regeração futura daquele mês
-- (ver lib/apuracao/gerar.ts, que aplica esse filtro por cima do cálculo puro da Ileva).
create table rastreador_exclusoes (
  cod_veiculo integer primary key,
  cod_consultor integer not null,
  placa text not null,
  associado text not null,
  valor numeric(10, 2) not null,
  excluido_por uuid references auth.users (id),
  excluido_em timestamptz not null default now()
);

alter table rastreador_exclusoes enable row level security;
-- Só acessível via service role key (gerado e consultado pelo backend/painel do Gestor) — mesma
-- regra das demais tabelas administrativas.
