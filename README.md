# Bob — HDOS v4

Cloud-connected iPad field app for Hicks Directional Drilling.

## One-time setup
Run `supabase-setup.sql` in Supabase SQL Editor.

## Current capabilities
- Start a drilling day
- Record pages, bores, footage, peds, notes, and photos
- Validate footage totals
- Upload photos to Supabase Storage
- Save drilling days to Supabase
- Load drilling history

## Security note
This field-test build uses temporary anonymous RLS policies. Add employee login before storing sensitive financial or personnel data.
