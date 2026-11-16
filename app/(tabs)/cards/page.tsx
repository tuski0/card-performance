'use client';

import Link from 'next/link';
import { Badge, CardChip, Panel, Progress, Screen, TopBar } from '@/components/ui';
import ExpiryBanner from '@/components/ExpiryBanner';
import RecommendPanel from '@/components/RecommendPanel';
import { CARDS } from '@/lib/cards';
import { useMonthData } from '@/lib/data/useMonthData';
import { useOwnedCards } from '@/lib/data/useOwnedCards';
import type { MonthResult } from '@/lib/engine/compute';
import { won } from '@/lib/format';

export default function CardsPage() {
  const { data, error } = useMonthData();
  const owned = useOwnedCards();
  const mm = data ? Number(data.month.slice(5)) : null;

  return (
    <Screen>
      <TopBar
        title={mm ? `${mm}월 카드 실적` : '카드 실적'}
        right={<Link href="/cards/recurring" className="rounded-full bg-surface px-3 py-2 text-[13px] font-semibold text-ink-2">반복 결제</Link>}
      />
      <ExpiryBanner />
      {error && <Panel><p className="text-bad">{error}</p></Panel>}
      {!data && !error && <Panel><p className="text-ink-3">불러오는 중…</p></Panel>}
      {data && <RecommendPanel data={data} owned={owned} />}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 [&>*]:min-w-0">
        {data && owned.map((id) => <CardPanel key={id} r={data.results[id]} />)}
      </div>
    </Screen>
  );
}

function CardPanel({ r }: { r: MonthResult }) {
  const card = CARDS[r.cardId];
  const saved = r.benefits.reduce((s, b) => s + b.used, 0);
  const done = r.target !== null && r.remainingToTarget === 0;
  const top = [...r.benefits].filter((b) => b.cap !== null).sort((a, b) => b.used / (b.cap || 1) - a.used / (a.cap || 1)).slice(0, 3);

  return (
    <Link href={`/cards/${r.cardId}`} className="block rounded-3xl bg-surface p-5 active:brightness-[0.98]">
      <div className="flex items-center gap-3">
        <CardChip id={r.cardId} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{card.name}</p>
          <p className="text-[13px] text-ink-3">이번 달 혜택 <span className="font-semibold text-brand">{won(saved)}</span></p>
        </div>
        {r.eligibility === 'unknown' && <Badge tone="warn">전월 미확인</Badge>}
        {r.eligibility === 'ineligible' && <Badge tone="bad">혜택 없음</Badge>}
      </div>

      {r.target !== null ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-[22px] font-bold tracking-tight">{won(r.performance)}</p>
            <p className="text-[13px] text-ink-3">목표 {won(r.target)}</p>
          </div>
          <div className="mt-2"><Progress value={r.performance} max={r.target} color={done ? 'var(--color-good)' : undefined} /></div>
          <p className={`mt-2 text-sm font-semibold ${done ? 'text-good' : 'text-brand'}`}>
            {done ? '다음 달 혜택 조건을 채웠어요' : `${won(r.remainingToTarget ?? 0)} 더 쓰면 다음 달 혜택`}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-[22px] font-bold tracking-tight">{won(r.performance)}</p>
      )}

      {top.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
          {top.map((b) => (
            <div key={b.id} className="flex items-center gap-3 text-[13px]">
              <span className="w-28 shrink-0 truncate text-ink-2">{b.label}</span>
              <Progress value={b.used} max={b.cap ?? 0} height={6} color={b.remaining === 0 ? 'var(--color-good)' : undefined} />
              <span className="w-16 shrink-0 text-right text-ink-3">{b.remaining === 0 ? '다 씀' : `${won(b.remaining ?? 0)}`}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
