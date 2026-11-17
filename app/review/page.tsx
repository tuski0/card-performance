'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CardChip, Panel, Screen, TopBar } from '@/components/ui';
import { CARDS, type Payment } from '@/lib/cards';
import { loadReview, resolveInbox, type InboxItem } from '@/lib/data/review';
import { dayKey } from '@/lib/engine/month';
import { errMsg, won } from '@/lib/format';
import { toFormQuery } from '@/lib/parse';
import { createClient } from '@/lib/supabase/client';

const REASON_TEXT: Record<string, string> = {
  'no-card': '카드를 알 수 없어요',
  'no-merchant': '가맹점을 읽지 못했어요',
  'no-cancel-target': '취소할 결제를 하나로 정하지 못했어요',
};

export default function ReviewPage() {
  const db = useMemo(() => createClient(), []);
  const [data, setData] = useState<{ payments: Payment[]; inbox: InboxItem[] } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await loadReview(db));
      setError('');
    } catch (e) {
      setError(errMsg(e, '불러오지 못했어요'));
    }
  }, [db]);
  useEffect(() => { load(); }, [load]);

  async function dismiss(id: string) {
    try {
      await resolveInbox(db, id);
      await load();
    } catch (e) {
      setError(errMsg(e, '지우지 못했어요'));
    }
  }

  return (
    <Screen className="max-w-xl pb-6">
      <TopBar back="/" title="자동 기록 확인" />
      {error && <Panel><p className="text-sm text-bad">{error}</p></Panel>}
      {!data && !error && <p className="py-8 text-center text-sm text-ink-3">불러오는 중…</p>}
      {data && data.payments.length === 0 && data.inbox.length === 0 && (
        <Panel><p className="py-4 text-center text-sm text-ink-3">확인할 항목이 없어요</p></Panel>
      )}

      {data && data.payments.length > 0 && (
        <Panel className="!px-2 !py-3">
          <h2 className="px-3 pb-1 text-[15px] font-semibold">답이 필요한 결제</h2>
          {data.payments.map((p) => (
            <Link key={p.id} href={`/new?id=${p.id}`} className="flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-fill">
              <CardChip id={p.cardId} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.merchant}</p>
                <p className="text-xs text-ink-3">{CARDS[p.cardId].name} · {dayKey(p.paidAt)}</p>
              </div>
              <span className="font-semibold">{won(p.amount)}</span>
            </Link>
          ))}
        </Panel>
      )}

      {data && data.inbox.length > 0 && (
        <Panel className="!px-2 !py-3">
          <h2 className="px-3 pb-1 text-[15px] font-semibold">카드를 모르는 알림</h2>
          {data.inbox.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-2xl px-3 py-3">
              <Link href={`/new?${toFormQuery(i.text)}&inbox=${i.id}`} className="min-w-0 flex-1">
                <p className="line-clamp-2 whitespace-pre-line text-[14px]">{i.text}</p>
                {REASON_TEXT[i.reason] && <p className="mt-0.5 text-xs text-ink-3">{REASON_TEXT[i.reason]}</p>}
                <p className="mt-0.5 text-xs text-ink-3">{dayKey(i.postedAt)}</p>
              </Link>
              <button onClick={() => dismiss(i.id)} className="shrink-0 text-sm font-semibold text-brand">지우기</button>
            </div>
          ))}
        </Panel>
      )}
    </Screen>
  );
}
