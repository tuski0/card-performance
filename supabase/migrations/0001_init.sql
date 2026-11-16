-- 카드 실적 관리: 사용자별 카드, 결제 기록, 월중 시작값
create table public.user_cards (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  card_id text not null,
  registered_at date,
  settings jsonb not null default '{}',
  primary key (user_id, card_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  card_id text not null,
  amount integer not null check (amount > 0),
  merchant text not null,
  category text not null default 'unknown',
  paid_at timestamptz not null default now(),
  canceled boolean not null default false,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index payments_user_paid_at on public.payments (user_id, paid_at);

create table public.month_starts (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  card_id text not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  performance integer not null default 0,
  benefit_used jsonb not null default '{}',
  primary key (user_id, card_id, month)
);

alter table public.user_cards enable row level security;
alter table public.payments enable row level security;
alter table public.month_starts enable row level security;

create policy "own rows" on public.user_cards for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.payments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on public.month_starts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
