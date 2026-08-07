# Bob — HDOS v5.2

Adds:
- Projects created separately from files.
- Multiple DFN PDFs per project.
- DFN name + revision tracking.
- Current vs archived revision status.
- New revisions do not overwrite old revisions.
- Martin production-sheet template remains attached to the project.
- Existing daily drilling record workflow remains available.

Important:
- Supabase Free currently limits each uploaded file to 50 MB. Split or compress any individual PDF above that limit.
- Run `supabase-v5-2-setup.sql` once.
- Then expose `project_documents` in Supabase Data API settings.
