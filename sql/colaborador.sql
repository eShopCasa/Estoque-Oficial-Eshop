-- Zerar a contagem de UM colaborador — rode UMA vez no Supabase: SQL Editor > New query > Run.
-- Pré-requisitos: já ter rodado sql/historico.sql, sql/equipe.sql e sql/master.sql.
-- Pode ser rodado de novo sem problema.
--
-- O que faz:
--   1) colaborador_reinicios  -> marca cada vez que o master zera um colaborador (nada é apagado)
--   2) zerar_colaborador()    -> confere a senha do master e grava o marco
--   3) desempenho_diario() / desempenho_total() passam a contar, para cada pessoa, só o que foi
--      bipado depois do último "zerar equipe" E depois do último "zerar colaborador" dela.
-- O Histórico de bipagens e o estoque NÃO são alterados.

create table if not exists public.colaborador_reinicios (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  colaborador text not null,        -- quem foi zerado
  username    text                  -- quem zerou
);

create index if not exists colaborador_reinicios_idx
  on public.colaborador_reinicios (colaborador, created_at desc);

-- Leitura liberada (as funções de resumo precisam); sem policy de insert/update/delete,
-- a chave "anon" só consegue gravar pela função zerar_colaborador (que pede a senha).
alter table public.colaborador_reinicios enable row level security;
drop policy if exists "colab_reinicios_select" on public.colaborador_reinicios;
create policy "colab_reinicios_select" on public.colaborador_reinicios
  for select using (true);

create or replace function public.zerar_colaborador(
  p_senha text,
  p_colaborador text,
  p_username text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.master_login(p_senha) then
    raise exception 'Senha invalida' using errcode = '42501';
  end if;
  if coalesce(trim(p_colaborador), '') = '' then
    raise exception 'Colaborador invalido';
  end if;
  insert into public.colaborador_reinicios (colaborador, username) values (p_colaborador, p_username);
end;
$$;

-- Pesquisa por dia/período: respeita o zerar equipe e o zerar colaborador.
-- (o retorno ganhou a coluna "devolucoes", por isso a função antiga é removida antes)
drop function if exists public.desempenho_diario(date, date, text);
create or replace function public.desempenho_diario(
  p_inicio date,
  p_fim    date,
  p_tz     text default 'America/Sao_Paulo'
)
returns table (dia date, username text, entradas bigint, devolucoes bigint, saidas bigint)
language sql
stable
as $$
  select
    (h.created_at at time zone p_tz)::date            as dia,
    coalesce(h.username, '—')                         as username,
    count(*) filter (where h.tipo = 'entrada')        as entradas,
    count(*) filter (where h.tipo = 'devolucao')      as devolucoes,
    count(*) filter (where h.tipo = 'saida')          as saidas
  from public.historico_bipagens h
  where h.tipo in ('entrada', 'saida', 'devolucao')
    and p_fim >= p_inicio
    and (p_fim - p_inicio) <= 29
    and h.created_at >= (p_inicio::timestamp at time zone p_tz)
    and h.created_at <  ((p_fim + 1)::timestamp at time zone p_tz)
    and h.created_at >= coalesce(
          (select max(r.created_at) from public.contagem_reinicios r),
          '-infinity'::timestamptz)
    and h.created_at >= coalesce(
          (select max(c.created_at) from public.colaborador_reinicios c
            where c.colaborador = coalesce(h.username, '—')),
          '-infinity'::timestamptz)
  group by 1, 2
  order by 1 desc, 2;
$$;

-- Total desde o último reinício (equipe e/ou colaborador).
drop function if exists public.desempenho_total();
create or replace function public.desempenho_total()
returns table (username text, entradas bigint, devolucoes bigint, saidas bigint)
language sql
stable
as $$
  select
    coalesce(h.username, '—')                         as username,
    count(*) filter (where h.tipo = 'entrada')        as entradas,
    count(*) filter (where h.tipo = 'devolucao')      as devolucoes,
    count(*) filter (where h.tipo = 'saida')          as saidas
  from public.historico_bipagens h
  where h.tipo in ('entrada', 'saida', 'devolucao')
    and h.created_at >= coalesce(
          (select max(r.created_at) from public.contagem_reinicios r),
          '-infinity'::timestamptz)
    and h.created_at >= coalesce(
          (select max(c.created_at) from public.colaborador_reinicios c
            where c.colaborador = coalesce(h.username, '—')),
          '-infinity'::timestamptz)
  group by 1
  order by count(*) desc, 1;
$$;

revoke all on function public.zerar_colaborador(text, text, text) from public;
grant execute on function public.zerar_colaborador(text, text, text) to anon, authenticated;
grant execute on function public.desempenho_diario(date, date, text) to anon, authenticated;
grant execute on function public.desempenho_total() to anon, authenticated;
