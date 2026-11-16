'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { BottomAction, CardChip, Panel, Screen, TopBar, primaryBtn, secondaryBtn } from '@/components/ui';
import { CARDS, type Payment } from '@/lib/cards';
import { getCardNumbers } from '@/lib/data/cardNumbers';
import { listPayments, markCanceled } from '@/lib/data/payments';
import { errMsg, won } from '@/lib/format';
import { findCancelTarget } from '@/lib/parse';
import { createClient } from '@/lib/supabase/client';

/** A shared "승인취소" notice: find the original payment and let the user mark it canceled. */
function CancelInner() {
  const db = useMemo(() => createClient(), []);
  const params = useSearchParams();
  const router = useRouter();
  const amount = Number(params.get('amount'));
  const merchant = params.get('merchant') ?? '';
  const at = params.get('at') ?? new Date().toISOString();
  const last4 = params.get('last4');
  const [target, setTarget] = useState<Payment | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const from = new Date(Date.parse(at) - 31 * 86_400_000).toISOString();
    const to = new Date(Date.parse(at) + 86_400_000).toISOString();
    // The notice carries the card's last 4 digits; use them to look only at that card's payments.
    Promise.all([listPayments(db, { from, to }), last4 ? getCardNumbers(db).catch(() => ({})) : Promise.resolve({})])
      .then(([list, numbers]) => {
        const cardId = last4 ? (numbers as Record<string, never>)[last4] ?? null : null;
        setTarget(findCancelTarget(list, { amount, merchant, paidAt: at, cardId }));
      })
      .catch((e) => setError(errMsg(e, '불러오지 못했어요')));
  }, [db, amount, merchant, at, last4]);

  async function confirm() {
    if (!target) return;
    setBusy(true);
    try {
      if (!(await markCanceled(db, target.id))) {
        setError('이 결제는 이미 지워졌어요. 내역을 새로 확인해 주세요.');
        setBusy(false);
        return;
      }
      router.replace('/');
    } catch (e) {
      setError(errMsg(e, '저장하지 못했어요'));
      setBusy(false);
    }
  }

  return (
    <Screen className="max-w-xl pb-6">
      <TopBar back="/" title="결제 취소 알림" />
      <Panel>
        <p className="text-[13px] text-ink-3">공유한 알림</p>
        <p className="mt-1 text-[17px] font-semibold">{merchant || '가맹점 없음'} · {amount > 0 ? won(amount) : '금액 없음'} 취소</p>
      </Panel>
      {error && <Panel><p className="text-sm text-bad">{error}</p></Panel>}
      {target === undefined && !error && <Panel><p className="text-ink-3">원래 결제를 찾는 중…</p></Panel>}
      {target === null && (
        <Panel>
          <p className="font-semibold">취소할 결제를 찾지 못했어요</p>
          <p className="mt-1 text-sm text-ink-3">최근 30일 안에 같은 금액, 같은 가맹점으로 기록된 결제가 없어요. 내역에서 직접 찾아 취소로 바꿔 주세요.</p>
        </Panel>
      )}
      {target && (
        <Panel className="flex flex-col gap-3">
          <p className="text-[13px] text-ink-3">이 결제를 취소로 바꿀까요? 실적과 할인에서 빠져요.</p>
          <div className="flex items-center gap-3">
            <CardChip id={target.cardId} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{target.merchant}</p>
              <p className="text-xs text-ink-3">
                {new Date(target.paidAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {CARDS[target.cardId].name}
              </p>
            </div>
            <p className="font-semibold">{won(target.amount)}</p>
          </div>
        </Panel>
      )}
      <BottomAction aboveTabs={false}>
        {target ? (
          <div className="grid grid-cols-2 gap-2">
            <Link href="/" className={secondaryBtn}>그대로 두기</Link>
            <button onClick={confirm} disabled={busy} className={primaryBtn}>{busy ? '바꾸는 중…' : '취소로 바꾸기'}</button>
          </div>
        ) : (
          <Link href="/history" className={primaryBtn}>내역에서 찾기</Link>
        )}
      </BottomAction>
    </Screen>
  );
}

export default function CancelPage() {
  return <Suspense><CancelInner /></Suspense>;
}
