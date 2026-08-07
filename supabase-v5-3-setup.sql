create table if not exists public.project_document_parts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_document_id uuid not null references public.project_documents(id) on delete cascade,
  part_number integer not null,
  original_filename text not null,
  storage_path text not null,
  file_size bigint,
  mime_type text
);
create unique index if not exists project_document_parts_unique_part on public.project_document_parts(project_document_id,part_number);
alter table public.project_document_parts enable row level security;
drop policy if exists "bob_project_document_parts_select" on public.project_document_parts;
drop policy if exists "bob_project_document_parts_insert" on public.project_document_parts;
create policy "bob_project_document_parts_select" on public.project_document_parts for select to anon using (true);
create policy "bob_project_document_parts_insert" on public.project_document_parts for insert to anon with check (true);
