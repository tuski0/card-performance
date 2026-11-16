'use client';

import Link from 'next/link';
import { CARDS } from '@/lib/cards';
import { dayKey } from '@/lib/engine/month';
import { expiryNotices } from '@/lib/engine/schedule';

/** Warns about card benefits that end within 30 days (or just ended). */
export default function ExpiryBanner() {
  const notices = expiryNotices(dayKey(new Date().toISOString()), 30);
  if (notices.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {notices.map((n) => (
        <Link key={n.cardId} href={`/cards/${n.cardId}`}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] ${n.daysLeft < 0 ? 'bg-bad-soft text-bad' : 'bg-warn-soft text-warn'}`}>
          <span className="text-lg" aria-hidden>⏰</span>
          <span className="flex-1">
            <b>{CARDS[n.cardId].name}</b>{' '}
            {n.daysLeft < 0 ? `혜택이 ${n.validUntil}에 끝났어요. 새 혜택을 확인해 주세요.`
              : n.daysLeft === 0 ? '혜택이 오늘 끝나요'
              : `혜택이 ${n.daysLeft}일 뒤(${n.validUntil}) 끝나요`}
          </span>
        </Link>
      ))}
    </div>
  );
}
