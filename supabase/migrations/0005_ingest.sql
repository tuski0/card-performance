-- 안드로이드 자동 기록: 기기 토큰, 알림 보관함, 결제 출처, 그리고 토큰으로 호출하는 두 함수

-- 기기 토큰: 원문은 저장하지 않고 sha256 해시만 저장
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.device_tokens enable row level security;
drop policy if exists "own rows" on public.device_tokens;
create policy "own rows" on public.device_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 알림 보관함: 자동으로 처리하지 못한 알림
create table if not exists public.notification_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null,
  reason text not null,
  posted_at timestamptz,
  source_key text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notification_inbox_user_key on public.notification_inbox (user_id, source_key);
alter table public.notification_inbox enable row level security;
drop policy if exists "own rows" on public.notification_inbox;
create policy "own rows" on public.notification_inbox for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 결제 출처와 알림 키(중복 방지용)
alter table public.payments add column if not exists source text not null default 'manual';
alter table public.payments add column if not exists source_key text;
create index if not exists payments_user_source_key on public.payments (user_id, source_key) where source_key is not null;

-- 앱이 알림을 해석하는 데 필요한 정보. 토큰이 없으면 null.
create or replace function public.ingest_context(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid;
begin
  if p_token is null or length(p_token) = 0 then return null; end if;
  select user_id into v_user from public.device_tokens
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_user is null then return null; end if;

  update public.device_tokens set last_used_at = now()
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  return jsonb_build_object(
    'cardNumbers', coalesce((
      select jsonb_object_agg(settings->>'last4', card_id)
      from public.user_cards
      where user_id = v_user and coalesce(settings->>'last4', '') <> ''
    ), '{}'::jsonb),
    'merchantMemory', coalesce((
      select jsonb_object_agg(merchant_key, category)
      from public.merchant_categories
      where user_id = v_user
    ), '{}'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'cardId', card_id, 'amount', amount, 'merchant', merchant,
        'category', category, 'brand', brand, 'paidAt', paid_at,
        'canceled', canceled, 'answers', answers) order by paid_at desc)
      from (
        select * from public.payments
        where user_id = v_user and paid_at >= now() - interval '31 days'
        order by paid_at desc limit 2000
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

-- 결정된 동작을 저장한다. 모든 접근은 토큰으로 찾은 사용자에게만 한정된다.
create or replace function public.ingest_save(
  p_token text, p_action jsonb, p_source_key text, p_text text, p_posted_at timestamptz)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid;
  v_kind text;
  v_key text := nullif(left(coalesce(p_source_key, ''), 200), '');
  v_text text := left(coalesce(p_text, ''), 2000);
  v_pay jsonb;
  v_amount integer;
  v_merchant text;
  v_card text;
  v_category text;
  v_paid_at timestamptz;
  v_reason text;
  v_id uuid;
  v_rows integer;
begin
  if p_token is null or length(p_token) = 0 then return 'unauthorized'; end if;
  select user_id into v_user from public.device_tokens
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_user is null then return 'unauthorized'; end if;

  if p_action is null or jsonb_typeof(p_action) <> 'object' then
    raise exception 'invalid action' using errcode = '22023';
  end if;
  v_kind := p_action->>'kind';
  if v_kind not in ('record', 'cancel', 'inbox') then
    raise exception 'invalid action kind' using errcode = '22023';
  end if;

  -- 같은 사용자·같은 키의 동시 요청을 한 줄로 세운다
  if v_key is not null then
    perform pg_advisory_xact_lock(hashtext(v_user::text || ':' || v_key));
    if exists (select 1 from public.payments
               where user_id = v_user and source_key = v_key and created_at > now() - interval '10 minutes')
       or exists (select 1 from public.notification_inbox
               where user_id = v_user and source_key = v_key and created_at > now() - interval '10 minutes') then
      return 'duplicate';
    end if;
  end if;

  if v_kind = 'record' then
    v_pay := p_action->'payment';
    if v_pay is null or jsonb_typeof(v_pay) <> 'object' then
      raise exception 'invalid payment' using errcode = '22023';
    end if;
    if jsonb_typeof(v_pay->'amount') <> 'number' or (v_pay->>'amount') !~ '^\d{1,9}$' then
      raise exception 'invalid amount' using errcode = '22023';
    end if;
    v_amount := (v_pay->>'amount')::integer;
    if v_amount <= 0 then raise exception 'invalid amount' using errcode = '22023'; end if;
    v_merchant := left(btrim(coalesce(v_pay->>'merchant', '')), 200);
    v_card := left(btrim(coalesce(v_pay->>'cardId', '')), 100);
    if v_merchant = '' or v_card = '' then
      raise exception 'invalid payment' using errcode = '22023';
    end if;
    v_category := coalesce(v_pay->>'category', 'unknown');
    if v_category not in ('food','cafe','convenience','transit','telecom','shopping','leisure','subscription','overseas','excluded','etc','unknown') then
      v_category := 'unknown';
    end if;
    begin
      v_paid_at := (v_pay->>'paidAt')::timestamptz;
    exception when others then
      v_paid_at := null;
    end;
    v_paid_at := coalesce(v_paid_at, p_posted_at, now());

    insert into public.payments (user_id, card_id, amount, merchant, category, brand, paid_at, canceled, answers, source, source_key)
    values (v_user, v_card, v_amount, v_merchant, v_category, nullif(left(coalesce(v_pay->>'brand', ''), 100), ''),
            v_paid_at, false, '{}'::jsonb, 'notification', v_key);
    return 'recorded';

  elsif v_kind = 'cancel' then
    if coalesce(p_action->>'paymentId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_id := (p_action->>'paymentId')::uuid;
      update public.payments set canceled = true where id = v_id and user_id = v_user;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then return 'canceled'; end if;
    end if;
    -- 대상이 없으면 보관함으로
    insert into public.notification_inbox (user_id, text, reason, posted_at, source_key)
    values (v_user, v_text, 'no-cancel-target', p_posted_at, v_key);
    return 'inboxed';

  else
    v_reason := p_action->>'reason';
    if v_reason is null or v_reason not in ('no-card', 'no-cancel-target', 'no-merchant') then
      v_reason := 'no-card';
    end if;
    insert into public.notification_inbox (user_id, text, reason, posted_at, source_key)
    values (v_user, v_text, v_reason, p_posted_at, v_key);
    return 'inboxed';
  end if;
end;
$$;

revoke all on function public.ingest_context(text) from public;
revoke all on function public.ingest_save(text, jsonb, text, text, timestamptz) from public;
grant execute on function public.ingest_context(text) to anon, authenticated;
grant execute on function public.ingest_save(text, jsonb, text, text, timestamptz) to anon, authenticated;
