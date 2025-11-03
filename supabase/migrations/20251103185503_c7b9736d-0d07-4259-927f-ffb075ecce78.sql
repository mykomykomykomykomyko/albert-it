-- Create a public storage bucket for generated images
insert into storage.buckets (id, name, public)
values ('generated-images', 'generated-images', true)
on conflict (id) do nothing;

-- Enable public read access for generated images
create policy "Public read generated images"
  on storage.objects for select
  using (bucket_id = 'generated-images');

-- Allow authenticated users to upload generated images
create policy "Authenticated upload generated images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'generated-images');
