# Bob — HDOS v5.1

Fixes the V5 iPad/Safari project upload error: `No content provided`.

Changes:
- Reads DFN/template files into ArrayBuffer bytes before upload.
- Rejects empty/unreadable files.
- Shows file name, size, and type.
- Shows upload step/progress.
- Gives step-specific errors.
- Uses the same byte upload method for jobsite photos.

No new SQL is required if the V5 setup already ran successfully.
