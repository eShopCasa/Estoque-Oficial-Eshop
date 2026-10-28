-- Senha do master guardada SÓ no banco (como hash) + zerar histórico da equipe.
-- Rode no Supabase: SQL Editor > New query > Run.
-- Pré-requisitos: já ter rodado sql/historico.sql e sql/equipe.sql.
-- Pode ser rodado de novo sem problema (serve também para trocar a senha).
--
-- ANTES DE RODAR: troque  TROQUE_ESTA_SENHA  (na linha do INSERT) pela senha nova.
-- Depois de rodar, NÃO salve essa query e apague a senha do editor.

create extension if not exists pgcrypto with schema extensions;

-- Tabela com o hash da senha. RLS ligado e NENHUMA policy: a chave "anon" não consegue ler nem escrever nela.
create table if not exists public.config_master (
  id         int primary key default 1 check (id = 1),
  senha_hash text not null
);
alter table public.config_master enable row level security;
revoke all on public.config_master from anon, authenticated;

-- >>> DEFINA/TROQUE A SENHA AQUI <<<
insert into public.config_master (id, senha_hash)
values (1, extensions.crypt('TROQUE_ESTA_SENHA', extensions.gen_salt('bf')))
on conflict (id) do update set senha_hash = excluded.senha_hash;

-- Confere a senha (login do master). Espera 1s se errar, para dificultar tentativas em massa.
create or replace function public.master_login(p_senha text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare ok boolean;
begin
  select (senha_hash = crypt(coalesce(p_senha, ''), senha_hash)) into ok
    from public.config_master where id = 1;
  if coalesce(ok, false) then return true; end if;
  perform pg_sleep(1);
  return false;
end;
$$;

-- Remove a função antiga que APAGAVA o histórico de bipagens (não é mais usada).
drop function if exists public.zerar_historico(text);

-- Zera o histórico da EQUIPE: registra um marco; hoje/total/período passam a contar só depois dele.
-- Nada é apagado: a aba Histórico (movimentação do estoque) e o estoque continuam intactos.
create or replace function public.zerar_equipe(p_senha text, p_username text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.master_login(p_senha) then
    raise exception 'Senha invalida' using errcode = '42501';
  end if;
  insert into public.contagem_reinicios (username) values (p_username);
end;
$$;

-- A pesquisa por dia/período agora também respeita o último "zerar equipe".
create or replace function public.desempenho_diario(
  p_inicio date,
  p_fim    date,
  p_tz     text default 'America/Sao_Paulo'
)
returns table (dia date, username text, entradas bigint, saidas bigint)
language sql
stable
as $$
  select
    (h.created_at at time zone p_tz)::date            as dia,
    coalesce(h.username, '—')                         as username,
    count(*) filter (where h.tipo = 'entrada')        as entradas,
    count(*) filter (where h.tipo = 'saida')          as saidas
  from public.historico_bipagens h
  where h.tipo in ('entrada', 'saida')
    and p_fim >= p_inicio
    and (p_fim - p_inicio) <= 29
    and h.created_at >= (p_inicio::timestamp at time zone p_tz)
    and h.created_at <  ((p_fim + 1)::timestamp at time zone p_tz)
    and h.created_at >= coalesce(
          (select max(r.created_at) from public.contagem_reinicios r),
          '-infinity'::timestamptz)
  group by 1, 2
  order by 1 desc, 2;
$$;

revoke all on function public.master_login(text) from public;
revoke all on function public.zerar_equipe(text, text) from public;
grant execute on function public.master_login(text) to anon, authenticated;
grant execute on function public.zerar_equipe(text, text) to anon, authenticated;
grant execute on function public.desempenho_diario(date, date, text) to anon, authenticated;
