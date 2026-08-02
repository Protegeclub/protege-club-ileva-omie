-- Corrige bug real (achado 30/07/2026): a tela de Configurações deixa o usuário editar o
-- próprio nome (lib/auth/conta-actions.ts, atualizarNomeProprioAction), mas `perfis` só tinha
-- policy de SELECT desde a migration inicial — o UPDATE rodava sem lançar erro (RLS bloqueia
-- silenciosamente, sem exceção, quando não há policy pra aquela operação), então a mensagem
-- "Nome atualizado." aparecia mas nenhuma linha era alterada de verdade.
create policy "usuario atualiza o proprio nome"
  on perfis for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sem isso, a policy acima libera a LINHA (a própria), mas não restringe a COLUNA — um
-- Consultor autenticado poderia, chamando a API REST do Supabase diretamente (não pela nossa
-- tela), tentar alterar o próprio `perfil` pra 'gestor' ou `cod_consultor` pra outro consultor
-- (escalação de privilégio). GRANT em nível de coluna garante que o role `authenticated` só
-- pode tocar em `nome`, mesmo com a policy de linha aberta. Não afeta o cliente admin (service
-- role), que já tem acesso total e ignora RLS.
revoke update on perfis from authenticated;
grant update (nome) on perfis to authenticated;
