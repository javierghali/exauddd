
-- Account Vault V2 - Supabase table
-- IMPORTANT:
-- This table stores only encrypted vault payloads (ciphertext).
-- Do not add plaintext username/password/cookie columns.

create table if not exists public.vaults (
  vault_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;

-- V2 simple personal deployment policy:
-- Allows access through the public anon key to rows.
-- Use only in a private project dedicated to this vault.
-- For stronger protection, add Supabase Auth in V3 and bind each row to auth.uid().
create policy "vault anon read"
on public.vaults
for select
to anon
using (true);

create policy "vault anon insert"
on public.vaults
for insert
to anon
with check (true);

create policy "vault anon update"
on public.vaults
for update
to anon
using (true)
with check (true);
