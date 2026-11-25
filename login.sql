-- Login com perfil automático — rode UMA vez no Supabase (SQL Editor > New query > Run).
-- A função confere utilizador + senha na tabela "usuarios" e devolve o perfil (entrada, saida ou admin).
-- Assim a tela de login não precisa mais de o utilizador escolher o perfil.
-- Pode ser rodado de novo sem problema.

-- Coluna que guarda o último login de cada utilizador (aparece na aba Logins, só para o master).
alter table public.usuarios add column if not exists ultimo_login timestamptz;

create or replace function public.login_usuario(p_username text, p_senha text)
returns table (username text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   bigint;
  v_user text;
  v_role text;
begin
  select u.id, u.username::text, u.role::text
    into v_id, v_user, v_role
    from public.usuarios u
   where lower(trim(u.username)) = lower(trim(coalesce(p_username, '')))
     and trim(u.password::text) = trim(coalesce(p_senha, ''))
   limit 1;

  if v_id is null then
    perform pg_sleep(1);  -- dificulta tentativas em massa
    return;
  end if;

  update public.usuarios u set ultimo_login = now() where u.id = v_id;
  return query select v_user, v_role;
end;
$$;

revoke all on function public.login_usuario(text, text) from public;
grant execute on function public.login_usuario(text, text) to anon, authenticated;
