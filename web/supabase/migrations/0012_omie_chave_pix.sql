-- Chave PIX do consultor (pedido do cliente, 15/08/2026) — a Omie preenche o pagamento por
-- transferência via chave Pix a partir dela (ver lib/omie/client.ts). Fica junto do vínculo já
-- confirmado (mesma tabela, mesmo padrão "uma vez, reaproveitado nos meses seguintes" do próprio
-- vínculo) em vez de pedir de novo a cada envio.
alter table consultor_omie_vinculo
  add column chave_pix text;
