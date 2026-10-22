-- Zerar histórico total (aba Histórico) — rode UMA vez no Supabase (SQL Editor > New query > Run).
-- Pré-requisito: já ter rodado sql/historico.sql e sql/master.sql.
--
-- Como funciona: registra um MARCO ("histórico zerado em ..."). A aba Histórico e o CSV do histórico
-- passam a mostrar só o que foi bipado DEPOIS do marco.
-- NÃO mexe: no estoque, na contagem da equipe (aba Equipe / "Zerar histórico da equipe"), nos logins
--           nem na senha do master. As bipagens continuam guardadas no banco.
-- A senha do master é conferida pelo banco; sem ela nada acontece.

create table if not exists public.historico_marcos (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  username    text                                   -- quem zerou
);

alter table public.historico_marcos enable row level security;

-- O app só pode LER os marcos; quem grava é a função abaixo (com a senha do master).
drop policy if exists "marcos_select" on public.historico_marcos;
create policy "marcos_select" on public.historico_marcos
  for select using (true);

grant select on public.historico_marcos to anon, authenticated;

create or replace function public.zerar_historico_total(p_senha text, p_username text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.master_login(p_senha) then
    raise exception 'Senha invalida' using errcode = '42501';
  end if;
  insert into public.historico_marcos (username) values (p_username);
end;
$$;

revoke all on function public.zerar_historico_total(text, text) from public;
grant execute on function public.zerar_historico_total(text, text) to anon, authenticated;

-- Remove a versão antiga (que apagava as bipagens de verdade), caso ela tenha sido criada antes.
drop function if exists public.zerar_historico_usuarios(text);

notify pgrst, 'reload schema';
