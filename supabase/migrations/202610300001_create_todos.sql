begin;

-- Passwords and email identities are managed exclusively by Supabase Auth.
-- Nicknames will be stored in auth.users.raw_user_meta_data via signUp options.data.
-- Metadata is for display only; authorization always uses auth.uid().
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 2000),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index todos_user_created_idx on public.todos (user_id, created_at, id);
alter table public.todos enable row level security;

revoke all on table public.todos from anon, authenticated;
grant select, delete on table public.todos to authenticated;
grant insert (text, completed) on table public.todos to authenticated;
grant update (text, completed) on table public.todos to authenticated;

create policy todos_select_own on public.todos
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy todos_insert_own on public.todos
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy todos_update_own on public.todos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy todos_delete_own on public.todos
  for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
