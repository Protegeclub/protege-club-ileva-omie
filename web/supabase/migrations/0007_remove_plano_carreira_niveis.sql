-- Remove `plano_carreira_niveis` — tabela especulativa criada na migration inicial (0001) pra um
-- possível sistema de "níveis" do plano de carreira. Nunca foi lida nem escrita por nenhum
-- código (só existia no schema, vazia). O cliente confirmou em 30/07/2026 que não existem
-- níveis nem bonificação de equipe — o plano de carreira é só o bônus individual descrito em
-- docs/GANHOS E INCETIVOS CORRETO ATUALIZADO.pdf (ver lib/apuracao/premiacao-individual.ts) —
-- então essa tabela não tem mais razão de existir.
drop table if exists plano_carreira_niveis;
