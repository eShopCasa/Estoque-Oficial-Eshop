-- Bucket público para as etiquetas (PNG). Rodar uma vez no SQL Editor do Supabase.
-- Leitura pública (o app baixa pelo navegador). Upload/alteração só com a service_role
-- (feito pelo script upload-etiquetas.js), então não há policy de escrita para o anon.

insert into storage.buckets (id, name, public, allowed_mime_types)
values ('etiquetas', 'etiquetas', true, array['image/png'])
on conflict (id) do update set public = true, allowed_mime_types = array['image/png'];

drop policy if exists "etiquetas leitura publica" on storage.objects;
create policy "etiquetas leitura publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'etiquetas');
