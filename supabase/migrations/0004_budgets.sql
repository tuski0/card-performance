-- 분류별 월 예산 (계정마다)
create table if not exists public.budgets (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category text not null,
  amount integer not null check (amount > 0),
  primary key (user_id, category)
);
alter table public.budgets enable row level security;
drop policy if exists "own rows" on public.budgets;
create policy "own rows" on public.budgets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
