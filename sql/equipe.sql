-- Desempenho da equipe — rode UMA vez no Supabase: SQL Editor > New query > Run.
-- Pré-requisito: já ter rodado sql/historico.sql.
--
-- O que cria:
--   1) contagem_reinicios  -> marca cada vez que você aperta "Reiniciar contagem"
--                             (o histórico de bipagens NÃO é apagado, só passa a contar do zero a partir dali)
--   2) desempenho_diario() -> unidades bipadas por pessoa e por dia, dentro de um período (máx. 30 dias)
--   3) desempenho_total()  -> unidades bipadas por pessoa desde o último reinício da contagem

create table if not exists public.contagem_reinicios (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  username    text                                   -- quem reiniciou
);

alter table public.contagem_reinicios enable row level security;

drop policy if exists "reinicios_select" on public.contagem_reinicios;
create policy "reinicios_select" on public.contagem_reinicios
  for select using (true);

drop policy if exists "reinicios_insert" on public.contagem_reinicios;
create policy "reinicios_insert" on public.contagem_reinicios
  for insert with check (true);

-- Unidades por pessoa e por dia (dia conforme o fuso informado). Intervalo acima de 30 dias retorna vazio.
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
  group by 1, 2
  order by 1 desc, 2;
$$;

-- Unidades por pessoa desde o último reinício (ou desde sempre, se nunca reiniciou).
create or replace function public.desempenho_total()
returns table (username text, entradas bigint, saidas bigint)
language sql
stable
as $$
  select
    coalesce(h.username, '—')                         as username,
    count(*) filter (where h.tipo = 'entrada')        as entradas,
    count(*) filter (where h.tipo = 'saida')          as saidas
  from public.historico_bipagens h
  where h.tipo in ('entrada', 'saida')
    and h.created_at >= coalesce(
          (select max(r.created_at) from public.contagem_reinicios r),
          '-infinity'::timestamptz)
  group by 1
  order by count(*) desc, 1;
$$;

grant execute on function public.desempenho_diario(date, date, text) to anon, authenticated;
grant execute on function public.desempenho_total() to anon, authenticated;
