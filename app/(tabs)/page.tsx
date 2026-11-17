'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import MonthView from '@/components/calendar/MonthView';
import WeekView from '@/components/calendar/WeekView';
import YearView from '@/components/calendar/YearView';
import { Chevron, DayList, EMPTY, WEEK_LABELS, sumStats, type DayStat } from '@/components/calendar/shared';
import ExpiryBanner from '@/components/ExpiryBanner';
import ReviewBanner from '@/components/ReviewBanner';
import ShortfallBanner from '@/components/ShortfallBanner';
import { BottomAction, Panel, Screen, primaryBtn } from '@/components/ui';
import { useAllPayments } from '@/lib/data/useAllPayments';
import { addDays, dayKey, monthShape, nextMonth, prevMonth, weekOf } from '@/lib/engine/month';
import { won } from '@/lib/format';

type Mode = 'day' | 'week' | 'month' | 'year';
const MODES: { id: Mode; label: string }[] = [
  { id: 'day', label: '일' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
  { id: 'year', label: '연' },
];

export default function CalendarPage() {
  const today = dayKey(new Date().toISOString());
  const thisMonth = today.slice(0, 7);
  const [mode, setMode] = useState<Mode>('month');
  const [selected, setSelected] = useState(today);
  const { payments, benefit, error } = useAllPayments();

  const month = selected.slice(0, 7);
  const year = selected.slice(0, 4);

  const stats = useMemo(() => {
    const m = new Map<string, DayStat>();
    for (const p of payments ?? []) {
      if (p.canceled) continue;
      const k = dayKey(p.paidAt);
      const d = m.get(k) ?? EMPTY;
      m.set(k, { spent: d.spent + p.amount, benefit: d.benefit + (benefit.get(p.id) ?? 0), count: d.count + 1 });
    }
    return m;
  }, [payments, benefit]);

  const dayPayments = useMemo(
    () => (payments ?? []).filter((p) => dayKey(p.paidAt) === selected).sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    [payments, selected],
  );

  // Days covered by the period in view, for the summary line.
  const period = useMemo(() => {
    if (mode === 'day') return [selected];
    if (mode === 'week') return weekOf(selected);
    if (mode === 'month') return Array.from({ length: monthShape(month).days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
    return [...stats.keys()].filter((k) => k.startsWith(year));
  }, [mode, selected, month, year, stats]);
  const total = sumStats(period, stats);

  const sel = new Date(`${selected}T12:00:00+09:00`);
  const week = weekOf(selected);
  const title =
    mode === 'year' ? `${year}년`
    : mode === 'month' ? `${Number(month.slice(5))}월`
    : mode === 'week' ? `${Number(week[0].slice(5, 7))}/${Number(week[0].slice(8))} ~ ${Number(week[6].slice(5, 7))}/${Number(week[6].slice(8))}`
    : `${sel.getMonth() + 1}월 ${sel.getDate()}일`;
  const sub = mode === 'month' ? year : mode === 'day' ? `${WEEK_LABELS[sel.getDay()]}요일` : mode === 'week' ? year : '';

  /** First day of a month, or today when that month is the current one. */
  const firstOf = (m: string) => (m === thisMonth ? today : `${m}-01`);

  function step(dir: -1 | 1) {
    if (mode === 'day') setSelected(addDays(selected, dir));
    else if (mode === 'week') setSelected(addDays(selected, dir * 7));
    else if (mode === 'month') setSelected(firstOf(dir < 0 ? prevMonth(month) : nextMonth(month)));
    else {
      const y = String(Number(year) + dir);
      setSelected(y === today.slice(0, 4) ? today : `${y}-01-01`);
    }
  }

  const inView = mode === 'month' ? month === thisMonth : mode === 'year' ? year === today.slice(0, 4) : mode === 'week' ? week.includes(today) : selected === today;
  const dayTitle = `${sel.getMonth() + 1}월 ${sel.getDate()}일 ${WEEK_LABELS[sel.getDay()]}요일`;
  const recordHref = mode === 'year' ? '/new' : `/new?date=${selected}`;
  const loading = !payments && !error;

  return (
    <Screen>
      {error && <Panel><p className="text-bad">{error}</p></Panel>}
      <div className="flex flex-col gap-2 pt-2"><ReviewBanner /><ExpiryBanner /><ShortfallBanner /></div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr] md:items-start [&>*]:min-w-0">
        <div className="flex flex-col gap-3">
          <section className="rounded-3xl bg-surface px-4 pb-4 pt-5 md:px-6">
            <div className="grid grid-cols-4 gap-1 rounded-2xl bg-fill p-1" role="tablist" aria-label="보기 단위">
              {MODES.map((m) => (
                <button key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}
                  className={`h-9 rounded-xl text-[14px] font-semibold transition-colors ${mode === m.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between px-1">
              <h1 className="text-[22px] font-bold tracking-tight">
                {title} {sub && <span className="text-[15px] font-semibold text-ink-3">{sub}</span>}
              </h1>
              <div className="flex items-center gap-1">
                {!inView && (
                  <button onClick={() => setSelected(today)} className="mr-1 rounded-full bg-fill px-3 py-1.5 text-[13px] font-semibold text-ink-2">오늘</button>
                )}
                <button aria-label="이전" onClick={() => step(-1)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-fill active:bg-line"><Chevron dir="left" /></button>
                <button aria-label="다음" onClick={() => step(1)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-fill active:bg-line"><Chevron dir="right" /></button>
              </div>
            </div>

            <div className="mt-3 flex items-end gap-5 px-1">
              <div>
                <p className="text-[13px] text-ink-3">지출</p>
                <p className="text-[20px] font-bold tracking-tight text-bad">{payments ? won(total.spent) : '—'}</p>
              </div>
              <div>
                <p className="text-[13px] text-ink-3">받은 혜택</p>
                <p className="text-[20px] font-bold tracking-tight text-brand">{payments ? `+${won(total.benefit)}` : '—'}</p>
              </div>
              {total.count > 0 && <p className="ml-auto pb-1 text-[13px] text-ink-3">{total.count}건</p>}
            </div>

            {mode === 'month' && <MonthView month={month} selected={selected} today={today} stats={stats} onSelect={setSelected} />}
            {mode === 'week' && <WeekView selected={selected} today={today} stats={stats} onSelect={setSelected} />}
            {mode === 'year' && (
              <YearView year={year} thisMonth={thisMonth} stats={stats} onPickMonth={(m) => { setSelected(firstOf(m)); setMode('month'); }} />
            )}
          </section>
        </div>

        <div className="flex flex-col gap-3">
          {mode !== 'year' ? (
            <DayList title={dayTitle} spent={stats.get(selected)?.spent ?? 0} payments={dayPayments} benefit={benefit} loading={loading} />
          ) : (
            <Panel><p className="py-4 text-center text-sm text-ink-3">달을 누르면 그 달의 달력으로 이동해요</p></Panel>
          )}
          <div className="hidden md:block"><Link href={recordHref} className={primaryBtn}>결제 기록</Link></div>
        </div>
      </div>

      <div className="md:hidden">
        <BottomAction><Link href={recordHref} className={primaryBtn}>결제 기록</Link></BottomAction>
      </div>
    </Screen>
  );
}
