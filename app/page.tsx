'use client';

import Link from 'next/link';
import { CARDS, type CardId } from '@/lib/cards';
import { useMonthData } from '@/lib/data/useMonthData';
import type { MonthResult } from '@/lib/engine/compute';
import { won } from '@/lib/format';

const ELIGIBILITY = {
  eligible: { text: '이번 달 혜택 받는 중', cls: 'text-green-700' },
  ineligible: { text: '전월 실적 부족 · 이번 달 혜택 없음', cls: 'text-red-700' },
  unknown: { text: '전월 실적 미확인', cls: 'text-amber-700' },
} as const;

export default function Home() {
  const { data, error } = useMonthData();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{data ? `${Number(data.month.slice(5))}월 카드 현황` : '카드 현황'}</h1>
        <Link href="/new" className="rounded-lg bg-black px-4 py-2 text-white">+ 결제 기록</Link>
      </header>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm text-neutral-500">불러오는 중…</p>}
      {data && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(CARDS) as CardId[]).map((id) => <CardSummary key={id} r={data.result(id)} />)}
        </div>
      )}
    </main>
  );
}

function CardSummary({ r }: { r: MonthResult }) {
  const card = CARDS[r.cardId];
  const pct = r.target ? Math.min(100, Math.round((r.performance / r.target) * 100)) : 100;
  const saved = r.benefits.reduce((s, b) => s + b.used, 0);
  const e = ELIGIBILITY[r.eligibility];

  return (
    <Link href={`/cards/${r.cardId}`} className="flex flex-col gap-2 rounded-xl border p-4 hover:border-neutral-500">
      <div className="font-medium">{card.name}</div>
      <div className={`text-xs ${e.cls}`}>{e.text}</div>
      <div className="flex items-baseline justify-between text-sm">
        <span>실적 {won(r.performance)}</span>
        {r.target !== null && <span className="text-neutral-500">목표 {won(r.target)}</span>}
      </div>
      {r.target !== null && (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full bg-black" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-sm">{r.remainingToTarget ? `${won(r.remainingToTarget)} 더 쓰면 달성` : '목표 달성'}</div>
        </>
      )}
      <div className="text-sm text-neutral-600">이번 달 혜택 {won(saved)}</div>
      {r.scope === 'recorded-only' && <div className="text-xs text-neutral-500">기록한 결제 기준</div>}
    </Link>
  );
}
