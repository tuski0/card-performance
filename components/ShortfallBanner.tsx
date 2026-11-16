'use client';

import Link from 'next/link';
import { CARD_COLORS } from '@/components/ui';
import { useMonthData } from '@/lib/data/useMonthData';
import { useOwnedCards } from '@/lib/data/useOwnedCards';
import { forecast } from '@/lib/engine/forecast';
import { dayKey } from '@/lib/engine/month';
import { short } from '@/lib/format';

/** Warns when an owned card is on track to miss next month's performance target. */
export default function ShortfallBanner() {
  const { data } = useMonthData();
  const owned = useOwnedCards();
  if (!data) return null;
  const today = dayKey(new Date().toISOString());
  const alerts = owned
    .map((id) => ({ id, r: data.results[id] }))
    .map(({ id, r }) => ({ id, f: forecast(r.performance, r.target, today) }))
    .filter(({ f }) => f.alert);
  if (alerts.length === 0) return null;
  return (
    <div className="rounded-2xl bg-warn-soft px-4 py-3 text-warn">
      <p className="text-[14px] font-semibold">다음 달 혜택까지 실적이 모자라요 · 말일까지 {alerts[0].f.daysLeft}일</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {alerts.map(({ id, f }) => (
          <li key={id}>
            <Link href={`/cards/${id}`} className="flex items-baseline justify-between gap-2 text-[13px]">
              <span><b>{CARD_COLORS[id].short}카드</b> {short(f.shortfall)}원 더</span>
              {f.projected > 0 && <span className="text-xs opacity-80">이대로면 {short(f.projected)}원</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
