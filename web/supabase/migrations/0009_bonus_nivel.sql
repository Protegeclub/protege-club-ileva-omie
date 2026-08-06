-- Bônus por Nível do plano de carreira (placas ativadas no mês) — ver
-- web/src/lib/apuracao/bonus-nivel.ts. O nível/título (Líder Júnior..Gestor Master) é só
-- exibição, derivado em tela a partir de detalhe.placasAtivadas — não precisa de coluna própria.
alter table apuracoes_mensais
  add column total_bonus_nivel numeric(12, 2) not null default 0;
