-- Histórico de bipagens — rode UMA vez no Supabase: SQL Editor > New query > Run.
-- Cada bipagem (entrada/saída), ajuste manual e "zerar estoque" vira uma linha.
-- O app agrupa por dia; dias sem linhas simplesmente não aparecem.

create table if not exists public.historico_bipagens (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  code        text not null,                 -- código de barras ('TODOS' no "zerar estoque")
  sku         text,
  produto     text,
  descricao   text,
  tipo        text not null check (tipo in ('entrada', 'saida', 'ajuste', 'zerar')),
  delta       integer not null default 0,    -- +1 entrada, -1 saída, variação no ajuste
  username    text
);

create index if not exists historico_bipagens_created_at_idx
  on public.historico_bipagens (created_at desc);

alter table public.historico_bipagens enable row level security;

-- O app usa a chave "anon": pode ler e inserir, mas NÃO editar nem apagar (histórico fica intacto).
drop policy if exists "historico_select" on public.historico_bipagens;
create policy "historico_select" on public.historico_bipagens
  for select using (true);

drop policy if exists "historico_insert" on public.historico_bipagens;
create policy "historico_insert" on public.historico_bipagens
  for insert with check (true);

-- Atualização em tempo real (outros aparelhos veem o histórico mudar sozinho).
do $$
begin
  alter publication supabase_realtime add table public.historico_bipagens;
exception when duplicate_object then null;
end $$;
