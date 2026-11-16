-- 반복 결제: 매달 정해진 날 자동으로 결제 기록을 만든다
create table public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  card_id text not null,
  amount integer not null check (amount > 0),
  merchant text not null,
  category text not null default 'unknown',
  day_of_month integer not null check (day_of_month between 1 and 31),
  answers jsonb not null default '{}',
  active boolean not null default true,
  start_month text not null check (start_month ~ '^\d{4}-\d{2}$'),
  -- 이 달까지는 이미 기록을 만들었다 (지운 결제가 다시 생기지 않게)
  generated_through text,
  created_at timestamptz not null default now()
);

alter table public.recurring_payments enable row level security;
create policy "own rows" on public.recurring_payments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 자동 생성된 결제는 어느 반복 결제의 몇 월분인지 기록해 중복 생성을 막는다
alter table public.payments
  add column recurring_id uuid references public.recurring_payments on delete set null,
  add column occurrence text;
create unique index payments_recurring_occurrence on public.payments (recurring_id, occurrence)
  where recurring_id is not null;
