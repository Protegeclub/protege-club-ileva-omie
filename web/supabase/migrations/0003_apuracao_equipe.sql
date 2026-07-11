-- Guarda a equipe do consultor junto da apuração, para calcular "Total Equipe" (soma das
-- adesões dos colegas de equipe no mesmo mês) sem precisar reconsultar o Ileva a cada leitura.
alter table apuracoes_mensais
  add column cod_equipe integer;

create index apuracoes_mensais_equipe_periodo_idx
  on apuracoes_mensais (cod_equipe, ano, mes);
