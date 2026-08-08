# Bob HDOS v5.3.2

Patch release based directly on the uploaded working v5.3.1 build.

- Automatically natural-sorts selected DFN PDF filenames before upload.
- Example: part1, part2, part3 even if the iPad picker returns part1, part3, part2.
- No Supabase changes required.
- Existing project and DFN data are unchanged.

# Bob HDOS v5.3.1

Regression-fix release based on the working v5.2 app.

- Keeps the full v5.2 Today, Projects, History, production-template, photo, and daily-record workflow.
- Restores project loading and shows errors instead of silently showing an empty list.
- Adds Reload Projects.
- Adds multiple PDF parts under one DFN revision.
- Does not replace the current revision unless all parts upload successfully.
- No new SQL is required if v5.3 setup already ran and project_document_parts is exposed.
