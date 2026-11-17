-- permanent idempotency keys for notification ingest, and ambiguity-safe cancel

-- One row per (user, notification key), kept forever. Only ingest_save (security definer) touches it.
create table if not exists public.ingest_events (
  user_id uuid not null references auth.users on delete cascade,
  source_key text not null,
  result text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, source_key)
);
alter table public.ingest_events enable row level security;
-- no policies on purpose: no direct access for anon/authenticated
revoke all on public.ingest_events from public, anon, authenticated;

-- keys already used by earlier ingests keep counting as duplicates
insert into public.ingest_events (user_id, source_key, result)
select user_id, source_key, 'recorded' from public.payments
  where source_key is not null and source = 'notification'
on conflict do nothing;
insert into public.ingest_events (user_id, source_key, result)
select user_id, source_key, 'inboxed' from public.notification_inbox
  where source_key is not null
on conflict do nothing;

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
  v_result text;
begin
  if p_token is null or length(p_token) = 0 then return 'unauthorized'; end if;
  select user_id into v_user from public.device_tokens
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_user is null then return 'unauthorized'; end if;

  if p_action is null or jsonb_typeof(p_action) <> 'object' then
    raise exception 'invalid action' using errcode = '22023';
  end if;
  v_kind := p_action->>'kind';
  if v_kind is null or v_kind not in ('record', 'cancel', 'inbox') then
    raise exception 'invalid action kind' using errcode = '22023';
  end if;

  -- Insert-first idempotency. A concurrent insert of the same (user, key) waits for the
  -- other transaction: if it commits we get 0 rows (duplicate), if it rolls back we proceed.
  -- Any later exception rolls this row back too, so a failed attempt can be retried.
  if v_key is not null then
    insert into public.ingest_events (user_id, source_key, result)
    values (v_user, v_key, 'pending')
    on conflict (user_id, source_key) do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then return 'duplicate'; end if;
  end if;

  if v_kind = 'record' then
    v_pay := p_action->'payment';
    if v_pay is null or jsonb_typeof(v_pay) <> 'object' then
      raise exception 'invalid payment' using errcode = '22023';
    end if;
    if coalesce(jsonb_typeof(v_pay->'amount'), '') <> 'number' or (v_pay->>'amount') !~ '^\d{1,9}$' then
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
    v_result := 'recorded';

  elsif v_kind = 'cancel' then
    v_result := null;
    if coalesce(p_action->>'paymentId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_id := (p_action->>'paymentId')::uuid;
      -- only a still-active payment of this user; an already canceled one is not canceled again
      update public.payments set canceled = true
        where id = v_id and user_id = v_user and canceled = false;
      get diagnostics v_rows = row_count;
      if v_rows > 0 then v_result := 'canceled'; end if;
    end if;
    if v_result is null then
      -- no unambiguous target: park the notice for a human
      insert into public.notification_inbox (user_id, text, reason, posted_at, source_key)
      values (v_user, v_text, 'no-cancel-target', p_posted_at, v_key);
      v_result := 'inboxed';
    end if;

  else
    v_reason := p_action->>'reason';
    if v_reason is null or v_reason not in ('no-card', 'no-cancel-target', 'no-merchant') then
      v_reason := 'no-card';
    end if;
    insert into public.notification_inbox (user_id, text, reason, posted_at, source_key)
    values (v_user, v_text, v_reason, p_posted_at, v_key);
    v_result := 'inboxed';
  end if;

  if v_key is not null then
    update public.ingest_events set result = v_result where user_id = v_user and source_key = v_key;
  end if;
  return v_result;
end;
$$;

revoke all on function public.ingest_save(text, jsonb, text, text, timestamptz) from public;
grant execute on function public.ingest_save(text, jsonb, text, text, timestamptz) to anon, authenticated;
