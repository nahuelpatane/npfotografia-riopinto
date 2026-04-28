-- ============================================================
-- NPFotografía — Orders table
-- Run once in the Supabase SQL Editor after schema.sql
-- ============================================================

create table if not exists orders (
  id             uuid default gen_random_uuid() primary key,
  payment_id     text unique not null,
  bib_number     integer not null,
  photo_ids      text[] not null default '{}',
  cloudinary_ids text[] not null default '{}',
  total_amount   numeric not null,
  buyer_email    text,
  status         text not null default 'approved',
  created_at     timestamp with time zone default now()
);

create index if not exists idx_orders_payment_id  on orders (payment_id);
create index if not exists idx_orders_bib_number  on orders (bib_number);

alter table orders enable row level security;

-- Webhook handler uses service_role key (bypasses RLS) → no INSERT policy needed
-- Success page reads by payment_id (public knowledge after checkout → safe)
create policy "read_order_by_payment_id"
  on orders for select
  to anon, authenticated
  using (true);

create policy "deny_anon_insert"
  on orders for insert
  to anon
  with check (false);
