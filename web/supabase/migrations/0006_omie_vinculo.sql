-- Vínculo consultor (Ileva) ↔ cliente/fornecedor (Omie) — necessário pra criar o título a pagar
-- no fornecedor certo. O Ileva não devolve CPF/CNPJ do consultor (confirmado com dado real em
-- 27/07/2026 — o endpoint /consultor/buscar aceita cpfCnpj como filtro de busca, mas não o
-- devolve no cadastro), então não dá pra casar automaticamente com 100% de confiança. O sistema
-- sugere o vínculo por nome (comparando com os ~3.900 clientes/fornecedores cadastrados no Omie)
-- e o Gestor confirma manualmente na tela de revisão — uma vez por consultor. A partir daí, essa
-- tabela guarda o vínculo confirmado e os meses seguintes não precisam perguntar de novo.
create table consultor_omie_vinculo (
  cod_consultor integer primary key,
  codigo_cliente_omie bigint not null,
  nome_omie text not null,
  confirmado_por uuid references auth.users (id),
  confirmado_em timestamptz not null default now()
);

alter table consultor_omie_vinculo enable row level security;
-- Só acessível via service role key (gerado e consultado pelo backend/painel do Gestor) — mesma
-- regra de ileva_token_cache e auditoria_omie.

-- Categoria financeira e conta corrente a usar em TODO título a pagar criado pelo sistema —
-- decisão contábil do cliente, não algo que o código deveria supor. Singleton (id sempre 1),
-- mesmo padrão de ileva_token_cache. Fica null até o Gestor configurar pela tela — o botão de
-- enviar pro Omie não aparece habilitado antes disso.
create table omie_configuracao (
  id int primary key default 1,
  codigo_categoria text,
  descricao_categoria text,
  codigo_conta_corrente bigint,
  descricao_conta_corrente text,
  atualizado_por uuid references auth.users (id),
  atualizado_em timestamptz not null default now(),
  constraint singleton check (id = 1)
);

alter table omie_configuracao enable row level security;
-- Só acessível via service role key.
