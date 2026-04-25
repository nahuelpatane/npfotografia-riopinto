-- Run this in the Supabase SQL Editor to create the photos table

create table if not exists photos (
  id               uuid default gen_random_uuid() primary key,
  bib_number       integer not null,
  cloudinary_public_id text not null,
  race_name        text not null default 'Carrera',
  original_filename text,
  created_at       timestamp with time zone default now()
);

-- Index for fast BIB lookups
create index if not exists idx_photos_bib_number on photos (bib_number);

-- Enable Row Level Security (read-only for anonymous users)
alter table photos enable row level security;

create policy "Allow public read" on photos
  for select using (true);
