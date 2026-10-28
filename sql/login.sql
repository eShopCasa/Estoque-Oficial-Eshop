-- Login com perfil automático — rode UMA vez no Supabase (SQL Editor > New query > Run).
-- A função confere utilizador + senha na tabela "usuarios" e devolve o perfil (entrada, saida ou admin).
-- Assim a tela de login não precisa mais de o utilizador escolher o perfil.
-- Pode ser rodado de novo sem problema.

create or replace function public.login_usuario(p_username text, p_senha text)
returns table (username text, role text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select u.username::text, u.role::text
      from public.usuarios u
     where lower(trim(u.username)) = lower(trim(coalesce(p_username, '')))
       and trim(u.password::text) = trim(coalesce(p_senha, ''))
     limit 1;
  if not found then
    perform pg_sleep(1);  -- dificulta tentativas em massa
  end if;
end;
$$;

revoke all on function public.login_usuario(text, text) from public;
grant execute on function public.login_usuario(text, text) to anon, authenticated;
