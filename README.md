# Bob HDOS v5.3.1

Regression-fix release based on the working v5.2 app.

- Keeps the full v5.2 Today, Projects, History, production-template, photo, and daily-record workflow.
- Restores project loading and shows errors instead of silently showing an empty list.
- Adds Reload Projects.
- Adds multiple PDF parts under one DFN revision.
- Does not replace the current revision unless all parts upload successfully.
- No new SQL is required if v5.3 setup already ran and project_document_parts is exposed.
