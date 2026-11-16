'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ExpiryBanner from '@/components/ExpiryBanner';
import { BottomAction, CardChip, Panel, Screen, primaryBtn } from '@/components/ui';
import { CARDS } from '@/lib/cards';
import { thisMonth, useMonthData } from '@/lib/data/useMonthData';
import { dayKey, monthKey, monthShape, nextMonth, prevMonth } from '@/lib/engine/month';
import { short, won } from '@/lib/format';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarPage() {
  const today = dayKey(new Date().toISOString());
  const [month, setMonth] = useState(thisMonth());
  const [selected, setSelected] = useState(today);
  const { data, error } = useMonthData(month);

  const monthPayments = useMemo(
    () => (data ? data.payments.filter((p) => monthKey(p.paidAt) === month) : []),
    [data, month],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, { spent: number; benefit: number; count: number }>();
    for (const p of monthPayments) {
      if (p.canceled) continue;
      const k = dayKey(p.paidAt);
      const d = m.get(k) ?? { spent: 0, benefit: 0, count: 0 };
      d.spent += p.amount;
      d.benefit += data?.benefitByPayment.get(p.id) ?? 0;
      d.count += 1;
      m.set(k, d);
    }
    return m;
  }, [monthPayments, data]);

  const spent = [...byDay.values()].reduce((s, d) => s + d.spent, 0);
  const benefit = data ? Object.values(data.results).flatMap((r) => r.benefits).reduce((s, b) => s + b.used, 0) : 0;
  const dayPayments = monthPayments.filter((p) => dayKey(p.paidAt) === selected).reverse();
  const { firstWeekday, days } = monthShape(month);
  const [, mm] = month.split('-').map(Number);
  const selDate = new Date(`${selected}T12:00:00+09:00`);

  function go(m: string) {
    setMonth(m);
    setSelected(m === thisMonth() ? today : `${m}-01`);
  }

  return (
    <Screen>
      {error && <Panel><p className="text-bad">{error}</p></Panel>}
      <div className="pt-2"><ExpiryBanner /></div>

      <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-[1.4fr_1fr] md:items-start [&>*]:min-w-0">
        <div className="flex flex-col gap-3">
          <section className="rounded-3xl bg-surface px-4 pb-4 pt-5 md:px-6">
            <div className="flex items-center justify-between px-1">
              <h1 className="text-[22px] font-bold tracking-tight">
                {mm}월 <span className="text-[15px] font-semibold text-ink-3">{month.slice(0, 4)}</span>
              </h1>
              <div className="flex items-center gap-1">
                {month !== thisMonth() && (
                  <button onClick={() => go(thisMonth())} className="mr-1 rounded-full bg-fill px-3 py-1.5 text-[13px] font-semibold text-ink-2">오늘</button>
                )}
                <button aria-label="이전 달" onClick={() => go(prevMonth(month))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-fill active:bg-line">
                  <Chevron dir="left" />
                </button>
                <button aria-label="다음 달" onClick={() => go(nextMonth(month))} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-fill active:bg-line">
                  <Chevron dir="right" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-end gap-5 px-1">
              <div>
                <p className="text-[13px] text-ink-3">지출</p>
                <p className="text-[20px] font-bold tracking-tight">{data ? won(spent) : '—'}</p>
              </div>
              <div>
                <p className="text-[13px] text-ink-3">받은 혜택</p>
                <p className="text-[20px] font-bold tracking-tight text-brand">{data ? `+${won(benefit)}` : '—'}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 text-center text-[12px] font-medium text-ink-3">
              {WEEK.map((w, i) => (
                <span key={w} className={i === 0 ? 'text-[#f9787f]' : i === 6 ? 'text-[#76abf8]' : ''}>{w}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7">
              {Array.from({ length: firstWeekday }, (_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: days }, (_, i) => {
                const key = `${month}-${String(i + 1).padStart(2, '0')}`;
                const d = byDay.get(key);
                const isSel = key === selected;
                const isToday = key === today;
                const wd = (firstWeekday + i) % 7;
                const numColor = isSel ? 'text-white' : isToday ? 'text-brand' : wd === 0 ? 'text-[#f04452]' : wd === 6 ? 'text-[#3182f6]/80' : 'text-ink';
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    aria-pressed={isSel}
                    aria-label={`${mm}월 ${i + 1}일${d ? `, ${won(d.spent)} 지출` : ''}`}
                    className="group flex h-[66px] flex-col items-center gap-0.5 pt-1 md:h-[76px]"
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-semibold transition-colors ${isSel ? 'bg-brand' : 'group-hover:bg-fill'} ${numColor}`}>
                      {i + 1}
                    </span>
                    <span className="h-3.5 text-[12px] font-bold leading-[14px] tracking-tight text-ink">{d ? short(d.spent) : ''}</span>
                    <span className="h-3 text-[10px] font-semibold leading-3 text-brand">{d && d.benefit > 0 ? `+${short(d.benefit)}` : ''}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3">
          <Panel className="!px-2 !py-3">
            <div className="flex items-baseline justify-between px-3 pb-1 pt-1">
              <h2 className="text-[15px] font-semibold">
                {selDate.getMonth() + 1}월 {selDate.getDate()}일 {WEEK[selDate.getDay()]}요일
              </h2>
              {byDay.get(selected) && <span className="text-[13px] text-ink-3">{won(byDay.get(selected)!.spent)}</span>}
            </div>
            {data && dayPayments.length === 0 && <p className="px-3 py-6 text-center text-ink-3">이날 기록한 결제가 없어요</p>}
            {!data && !error && <p className="px-3 py-6 text-center text-ink-3">불러오는 중…</p>}
            {dayPayments.map((p) => {
              const b = data?.benefitByPayment.get(p.id) ?? 0;
              return (
                <Link key={p.id} href={`/new?id=${p.id}`} className="flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-fill">
                  <CardChip id={p.cardId} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold ${p.canceled ? 'text-ink-3 line-through' : ''}`}>{p.merchant}</p>
                    <p className="truncate text-xs text-ink-3">
                      {new Date(p.paidAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · {CARDS[p.cardId].name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-semibold ${p.canceled ? 'text-ink-3 line-through' : ''}`}>{won(p.amount)}</p>
                    {b > 0 && <p className="text-xs font-semibold text-brand">혜택 {won(b)}</p>}
                    {p.canceled && <p className="text-xs text-ink-3">취소</p>}
                  </div>
                </Link>
              );
            })}
          </Panel>
          <div className="hidden md:block">
            <Link href={`/new?date=${selected}`} className={primaryBtn}>결제 기록</Link>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <BottomAction>
          <Link href={`/new?date=${selected}`} className={primaryBtn}>결제 기록</Link>
        </BottomAction>
      </div>
    </Screen>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'} />
    </svg>
  );
}
