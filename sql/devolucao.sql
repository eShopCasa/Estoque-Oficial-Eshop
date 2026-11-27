-- Login de DEVOLUÇÃO — rode UMA vez no Supabase: SQL Editor > New query > Run.
-- Pode ser rodado de novo sem problema.
--
-- 1) O histórico passa a aceitar o tipo 'devolucao' (soma +1 no estoque, igual à entrada, mas aparece em amarelo).
-- 2) A tabela "usuarios" passa a aceitar o perfil 'devolucao' (se houver regra/enum limitando os perfis).
--
-- Na aba Equipe, a devolução é contada junto das entradas do colaborador.
-- Depois deste arquivo, rode de novo o sql/colaborador.sql (ou equipe.sql + master.sql, se não usa o colaborador.sql)
-- para as funções da Equipe passarem a contar as devoluções.

-- 1) Histórico
alter table public.historico_bipagens drop constraint if exists historico_bipagens_tipo_check;
alter table public.historico_bipagens
  add constraint historico_bipagens_tipo_check
  check (tipo in ('entrada', 'saida', 'ajuste', 'zerar', 'devolucao'));

-- 2) Perfis da tabela "usuarios"
do $$
declare
  c record;
  t text;
begin
  -- regras (check) que limitam a coluna role: removidas para aceitar 'devolucao'
  for c in
    select conname from pg_constraint
     where conrelid = 'public.usuarios'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.usuarios drop constraint %I', c.conname);
  end loop;

  -- se "role" for um enum, adiciona o valor
  select udt_name into t from information_schema.columns
   where table_schema = 'public' and table_name = 'usuarios' and column_name = 'role';
  if t is not null and exists (select 1 from pg_type where typname = t and typtype = 'e') then
    execute format('alter type public.%I add value if not exists %L', t, 'devolucao');
  end if;
end $$;
