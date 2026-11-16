-- 2단계: 대분류 + 브랜드, 가맹점 분류 기억, 내 카드, 카드 추가 요청

-- 브랜드 id (알려진 브랜드가 아니면 null)
alter table public.payments add column if not exists brand text;
alter table public.recurring_payments add column if not exists brand text;

-- 옛 분류값은 모두 '미분류'로 (새 분류 12개만 허용)
update public.payments set category = 'unknown'
  where category not in ('food','cafe','convenience','transit','telecom','shopping','leisure','subscription','overseas','excluded','etc','unknown');
update public.recurring_payments set category = 'unknown'
  where category not in ('food','cafe','convenience','transit','telecom','shopping','leisure','subscription','overseas','excluded','etc','unknown');
