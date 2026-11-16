-- 2단계: 대분류 + 브랜드, 가맹점 분류 기억, 내 카드, 카드 추가 요청

-- 브랜드 id (알려진 브랜드가 아니면 null)
alter table public.payments add column if not exists brand text;
alter table public.recurring_payments add column if not exists brand text;

-- 옛 분류값은 모두 '미분류'로 (새 분류 12개만 허용)
update public.payments set category = 'unknown'
  where category not in ('food','cafe','convenience','transit','telecom','shopping','leisure','subscription','overseas','excluded','etc','unknown');
update public.recurring_payments set category = 'unknown'
  where category not in ('food','cafe','convenience','transit','telecom','shopping','leisure','subscription','overseas','excluded','etc','unknown');

-- 가맹점 분류 기억: 알려진 브랜드가 아닌 가맹점은 한 번 고른 분류를 다음부터 자동으로 채운다
create table if not exists public.merchant_categories (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  merchant_key text not null,
  category text not null,
  primary key (user_id, merchant_key)
);
alter table public.merchant_categories enable row level security;
drop policy if exists "own rows" on public.merchant_categories;
create policy "own rows" on public.merchant_categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
