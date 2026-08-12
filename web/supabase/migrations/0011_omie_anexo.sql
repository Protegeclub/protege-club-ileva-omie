-- Anexar o relatório (PDF do dashboard, sem a seção de inadimplentes) ao título criado no Omie
-- — pedido do cliente, 10/08/2026. Rastreado na própria linha de auditoria_omie (é sempre 1
-- anexo por título, não precisa de tabela/granularidade própria).
alter table auditoria_omie
  add column anexo_status text not null default 'nao_tentado', -- nao_tentado | enviado | erro
  add column anexo_erro text;

alter table auditoria_omie
  add constraint auditoria_omie_anexo_status_check check (anexo_status in ('nao_tentado', 'enviado', 'erro'));
