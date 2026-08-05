-- Bob HDOS v4 one-time Supabase setup
alter table public.drilling_days enable row level security;
alter table public.drilling_days
  add column if not exists "Project" text,
  add column if not exists assigned_pages text,
  add column if not exists actual_pages text,
  add column if not exists "Total_footage" integer,
  add column if not exists pedestals integer default 0,
  add column if not exists notes text,
  add column if not exists photos integer default 0,
  add column if not exists production_sheet_complete boolean default false,
  add column if not exists contractor_package_complete boolean default false,
  add column if not exists redlines_complete boolean default false;
drop policy if exists "bob_anon_select_drilling_days" on public.drilling_days;
drop policy if exists "bob_anon_insert_drilling_days" on public.drilling_days;
create policy "bob_anon_select_drilling_days" on public.drilling_days for select to anon using (true);
create policy "bob_anon_insert_drilling_days" on public.drilling_days for insert to anon with check (true);
insert into storage.buckets (id,name,public) values ('job-photos','job-photos',false) on conflict (id) do nothing;
drop policy if exists "bob_anon_upload_job_photos" on storage.objects;
drop policy if exists "bob_anon_read_job_photos" on storage.objects;
create policy "bob_anon_upload_job_photos" on storage.objects for insert to anon with check (bucket_id='job-photos');
create policy "bob_anon_read_job_photos" on storage.objects for select to anon using (bucket_id='job-photos');
