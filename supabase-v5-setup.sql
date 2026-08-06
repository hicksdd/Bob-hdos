create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  contractor text,
  status text not null default 'active',
  dfn_pdf_path text,
  production_template_path text
);
alter table public.projects enable row level security;
drop policy if exists "bob_projects_select" on public.projects;
drop policy if exists "bob_projects_insert" on public.projects;
drop policy if exists "bob_projects_update" on public.projects;
create policy "bob_projects_select" on public.projects for select to anon using (true);
create policy "bob_projects_insert" on public.projects for insert to anon with check (true);
create policy "bob_projects_update" on public.projects for update to anon using (true) with check (true);
alter table public.drilling_days add column if not exists project_id uuid references public.projects(id);
insert into storage.buckets(id,name,public) values('project-files','project-files',false) on conflict(id) do nothing;
drop policy if exists "bob_project_files_insert" on storage.objects;
drop policy if exists "bob_project_files_select" on storage.objects;
drop policy if exists "bob_project_files_update" on storage.objects;
create policy "bob_project_files_insert" on storage.objects for insert to anon with check(bucket_id='project-files');
create policy "bob_project_files_select" on storage.objects for select to anon using(bucket_id='project-files');
create policy "bob_project_files_update" on storage.objects for update to anon using(bucket_id='project-files') with check(bucket_id='project-files');
