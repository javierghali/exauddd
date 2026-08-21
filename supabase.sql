-- Silverback Vault V3 - Supabase Auth + RLS
-- Stores ciphertext only. Do not add plaintext credential columns.

create table if not exists public.vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vault_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vault_id)
);

alter table public.vaults enable row level security;

-- Required when new-table privileges are not automatically exposed to Data API roles.
-- RLS still limits every row to auth.uid() = user_id.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.vaults to authenticated;
revoke all on table public.vaults from anon;

drop policy if exists "vault anon read" on public.vaults;
drop policy if exists "vault anon insert" on public.vaults;
drop policy if exists "vault anon update" on public.vaults;
drop policy if exists "Users can read own vaults" on public.vaults;
drop policy if exists "Users can insert own vaults" on public.vaults;
drop policy if exists "Users can update own vaults" on public.vaults;
drop policy if exists "Users can delete own vaults" on public.vaults;

create policy "Users can read own vaults"
on public.vaults for select to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own vaults"
on public.vaults for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own vaults"
on public.vaults for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own vaults"
on public.vaults for delete to authenticated
using (auth.uid() = user_id);

create index if not exists vaults_user_id_idx on public.vaults(user_id);
