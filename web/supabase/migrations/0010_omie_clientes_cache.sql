-- Cache persistente (compartilhado entre instâncias serverless) da lista de clientes/
-- fornecedores da Omie (~3.900 registros) usada pra sugerir vínculo por nome na tela
-- /gestor/omie. Um cache só em memória do processo (o que existia antes) não ajuda instância
-- fria nenhuma — cada Lambda nova da Vercel recomeça do zero — e buscar essa lista na Omie é
-- lento (~8 chamadas paginadas sequenciais, 10-40s) e sujeito ao bloqueio de "consumo redundante"
-- da própria Omie se coincidir com outra chamada igual em andamento. Com esse cache, só a
-- primeira instância a atualizar em cada janela de 30min paga esse custo; todas as outras (frias
-- ou não) leem daqui, que é rápido. Singleton (id sempre 1), mesmo padrão de
-- ileva_token_cache/omie_configuracao (0001/0006).
create table omie_clientes_cache (
  id int primary key default 1,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  constraint singleton check (id = 1)
);

alter table omie_clientes_cache enable row level security;
-- Só acessível via service role key.
