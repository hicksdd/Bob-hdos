-- Optional: safe to run if v5.3 split-file setup is already installed.
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
create unique index if not exists project_document_parts_unique_part
on public.project_document_parts(project_document_id,part_number);
alter table public.project_document_parts enable row level security;
