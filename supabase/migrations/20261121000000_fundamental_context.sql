begin;

create table public.fundamental_context_blocks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  block text not null check (block in (
    'regime', 'dollar', 'week', 'EURUSD', 'GBPUSD', 'AUDUSD', 'calendar', 'banks', 'notes'
  )),
  content jsonb not null,
  primary key (user_id, week_start, block),
  check (
    (block = 'calendar' and jsonb_typeof(content) = 'array')
    or (block <> 'calendar' and jsonb_typeof(content) = 'object')
  )
);

alter table public.fundamental_context_blocks enable row level security;
revoke all on public.fundamental_context_blocks from anon, authenticated;
grant select, insert, update on public.fundamental_context_blocks to authenticated;

create policy "Read own fundamental context"
  on public.fundamental_context_blocks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Insert own fundamental context"
  on public.fundamental_context_blocks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Update own fundamental context"
  on public.fundamental_context_blocks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
