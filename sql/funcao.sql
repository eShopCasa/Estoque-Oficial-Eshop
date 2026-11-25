-- Função do utilizador no histórico — rode UMA vez no Supabase (SQL Editor > New query > Run).
-- Pré-requisito: já ter rodado sql/historico.sql.
-- Passa a gravar se quem bipou era admin, entrada ou saída (aparece no CSV do histórico).

alter table public.historico_bipagens add column if not exists funcao text;

-- Preenche as bipagens antigas com o perfil atual do utilizador (quando ele ainda existe na tabela "usuarios").
update public.historico_bipagens h
   set funcao = u.role
  from public.usuarios u
 where h.funcao is null
   and lower(trim(h.username)) = lower(trim(u.username));

-- Administrador master (login direto, não está na tabela "usuarios").
update public.historico_bipagens
   set funcao = 'admin'
 where funcao is null
   and lower(trim(username)) in ('lucas d''', 'lucas d');
