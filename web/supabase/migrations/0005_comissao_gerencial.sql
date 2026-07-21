-- Comissão gerencial: consultor #302 (Thiago Siqueira Abba) recebe R$2,00 por placa ativada de
-- todos os outros consultores no mês, exceto a equipe do consultor #19 (Marcos Aurélio Vieira
-- Cabral, equipe "Marcos Cabral", cod_equipe=7) — ver web/src/lib/apuracao/comissao-gerencial.ts.
alter table apuracoes_mensais
  add column total_comissao_gerencial numeric(12, 2) not null default 0;
