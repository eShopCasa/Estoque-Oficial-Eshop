-- Permissões de acesso — rode no Supabase (SQL Editor > New query > Run) se o Histórico ou a Equipe
-- aparecerem vazios ou com "permission denied". Pode rodar mais de uma vez sem problema.
-- Pré-requisito: já ter rodado historico.sql e equipe.sql.
-- (Projetos novos do Supabase não liberam automaticamente tabelas criadas por SQL para o app.)

grant usage on schema public to anon, authenticated;

grant select, insert on public.historico_bipagens to anon, authenticated;
grant select, insert on public.contagem_reinicios to anon, authenticated;

-- A numeração automática (id) precisa de permissão para gravar novas linhas.
grant usage, select on all sequences in schema public to anon, authenticated;

grant execute on function public.desempenho_diario(date, date, text) to anon, authenticated;
grant execute on function public.desempenho_total() to anon, authenticated;

-- Atualiza o cache da API do Supabase.
notify pgrst, 'reload schema';
