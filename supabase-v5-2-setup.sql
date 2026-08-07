-- Bob HDOS v5.2: Project document library + DFN revision control

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  uploaded_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_type text not null default 'dfn',
  document_name text not null,
  revision text,
  original_filename text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text,
  is_current boolean not null default true,
  status text not null default 'active'
);

create index if not exists project_documents_project_idx
  on public.project_documents(project_id);

create index if not exists project_documents_lookup_idx
  on public.project_documents(project_id, document_type, document_name, is_current);

alter table public.project_documents enable row level security;

drop policy if exists "bob_project_documents_select" on public.project_documents;
drop policy if exists "bob_project_documents_insert" on public.project_documents;
drop policy if exists "bob_project_documents_update" on public.project_documents;

create policy "bob_project_documents_select"
on public.project_documents for select to anon using (true);

create policy "bob_project_documents_insert"
on public.project_documents for insert to anon with check (true);

create policy "bob_project_documents_update"
on public.project_documents for update to anon using (true) with check (true);
