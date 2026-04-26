-- ============================================================
-- NPFotografía — Supabase schema
-- Run once in the Supabase SQL Editor (Settings › SQL Editor)
-- ============================================================

-- ── Table ────────────────────────────────────────────────────
create table if not exists photos (
  id                   uuid default gen_random_uuid() primary key,
  bib_number           integer not null,
  cloudinary_public_id text not null,
  race_name            text not null default 'Carrera',
  original_filename    text,
  created_at           timestamp with time zone default now()
);

-- ── Indexes ──────────────────────────────────────────────────
-- Fast BIB lookups even with 50,000+ rows
create index if not exists idx_photos_bib_number
  on photos (bib_number);

-- Prevents duplicate rows for the same photo+bib (required for upsert)
create unique index if not exists idx_photos_bib_public_id_unique
  on photos (bib_number, cloudinary_public_id);

-- ── Row Level Security ────────────────────────────────────────
-- Security model:
--   • Frontend (NEXT_PUBLIC_SUPABASE_ANON_KEY) → SELECT only
--   • Python script (SUPABASE_SERVICE_ROLE_KEY) → all ops (bypasses RLS)
--   • No anon INSERT / UPDATE / DELETE — denied by default when RLS is on

alter table photos enable row level security;

-- Allow anyone to read photos (needed for the public gallery)
create policy "public_read_photos"
  on photos for select
  to anon, authenticated
  using (true);

-- Explicitly block anon writes (belt-and-suspenders — denied by default anyway)
create policy "deny_anon_insert"
  on photos for insert
  to anon
  with check (false);

create policy "deny_anon_update"
  on photos for update
  to anon
  using (false);

create policy "deny_anon_delete"
  on photos for delete
  to anon
  using (false);

-- ── Notes ─────────────────────────────────────────────────────
-- The service_role key bypasses RLS entirely, so indexar_fotos.py
-- can INSERT / UPSERT without any additional policy.
-- NEVER expose SUPABASE_SERVICE_ROLE_KEY in NEXT_PUBLIC_* variables.
