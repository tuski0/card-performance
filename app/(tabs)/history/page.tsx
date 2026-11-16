'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CARD_COLORS, CardChip, Panel, Screen, TopBar } from '@/components/ui';
import { CARDS, type CardId, type Payment } from '@/lib/cards';
import { useAllPayments } from '@/lib/data/useAllPayments';
import { thisMonth } from '@/lib/data/useMonthData';
import { byDay, byMonth, byWeek, byYear, type Group } from '@/lib/engine/history';
import { nextMonth, prevMonth } from '@/lib/engine/month';
import { won } from '@/lib/format';

type Mode = 'day' | 'week' | 'month' | 'year';
const MODES: { id: Mode; label: string }[] = [
  { id: 'day', label: '일별' },
  { id: 'week', label: '주별' },
  { id: 'month', label: '월별' },
  { id: 'year', label: '연도별' },
];
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export default function HistoryPage() {
  const { payments, benefit, error } = useAllPayments();
  const [mode, setMode] = useState<Mode>('day');
  const [month, setMonth] = useState(thisMonth());
  const [year, setYear] = useState(thisMonth().slice(0, 4));
  const [card, setCard] = useState<CardId | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => (payments ?? []).filter((p) => card === 'all' || p.cardId === card), [payments, card]);

  const groups: Group[] = useMemo(() => {
    if (mode === 'day') return byDay(list, month, benefit);
    if (mode === 'week') return byWeek(list, month, benefit);
    if (mode === 'month') return byMonth(list, year, benefit);
    return byYear(list, benefit);
  }, [mode, list, month, year, benefit]);

  const total = groups.reduce((t, g) => ({ spent: t.spent + g.spent, benefit: t.benefit + g.benefit, count: t.count + g.count }), { spent: 0, benefit: 0, count: 0 });
  const max = Math.max(1, ...groups.map((g) => g.spent));
  const periodLabel = mode === 'year' ? '전체 기간' : mode === 'month' ? `${year}년` : `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;

  function step(dir: -1 | 1) {
    setOpen(null);
    if (mode === 'month') setYear(String(Number(year) + dir));
    else setMonth(dir < 0 ? prevMonth(month) : nextMonth(month));
  }

  return (
    <Screen>
      <TopBar title="내역" />

      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-line/60 p-1" role="tablist">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => { setMode(m.id); setOpen(null); }}
            className={`h-10 rounded-xl text-[14px] font-semibold transition-colors ${mode === m.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <FilterChip on={card === 'all'} onClick={() => setCard('all')}>전체 카드</FilterChip>
        {(Object.keys(CARDS) as CardId[]).map((id) => (
          <FilterChip key={id} on={card === id} onClick={() => setCard(id)}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CARD_COLORS[id].bg }} />
            {CARD_COLORS[id].short}
          </FilterChip>
        ))}
      </div>

      <Panel className="!py-4">
        <div className="flex items-center justify-between">
          {mode !== 'year' ? (
            <div className="-ml-2 flex items-center">
              <NavBtn dir="left" onClick={() => step(-1)} />
              <span className="min-w-[96px] text-center text-[15px] font-semibold">{periodLabel}</span>
              <NavBtn dir="right" onClick={() => step(1)} />
            </div>
          ) : <span className="text-[15px] font-semibold">{periodLabel}</span>}
          <span className="text-[13px] text-ink-3">{total.count}건</span>
        </div>
        <div className="mt-3 flex items-end gap-5">
          <div>
            <p className="text-[13px] text-ink-3">지출</p>
            <p className="text-[22px] font-bold tracking-tight">{payments ? won(total.spent) : '—'}</p>
          </div>
          <div>
            <p className="text-[13px] text-ink-3">받은 혜택</p>
            <p className="text-[22px] font-bold tracking-tight text-brand">{payments ? `+${won(total.benefit)}` : '—'}</p>
          </div>
        </div>
      </Panel>

      {error && <Panel><p className="text-sm text-bad">{error}</p></Panel>}
      {!payments && !error && <Panel><p className="text-ink-3">불러오는 중…</p></Panel>}
      {payments && groups.every((g) => g.payments.length === 0) && (
        <Panel><p className="py-6 text-center text-ink-3">이 기간에 기록한 결제가 없어요</p></Panel>
      )}

      {payments && mode === 'day' && groups.map((g) => (
        <Panel key={g.key} className="!px-2 !py-3">
          <div className="flex items-baseline justify-between px-3 pb-1 pt-1">
            <h2 className="text-[15px] font-semibold">
              {Number(g.key.slice(8))}일 <span className="text-ink-3">{WEEK[new Date(`${g.key}T12:00:00+09:00`).getDay()]}요일</span>
            </h2>
            <span className="text-[13px] text-ink-3">{won(g.spent)}{g.benefit > 0 && <b className="text-brand"> · +{won(g.benefit)}</b>}</span>
          </div>
          {g.payments.map((p) => <PaymentRow key={p.id} p={p} benefit={benefit.get(p.id) ?? 0} />)}
        </Panel>
      ))}

      {payments && mode !== 'day' && groups.some((g) => g.payments.length > 0) && (
        <Panel className="!px-2 !py-2">
          {groups.map((g) => {
            const w = g as Group & { from?: string; to?: string };
            const label = mode === 'week' ? `${md(w.from!)} ~ ${md(w.to!)}` : mode === 'month' ? `${Number(g.key.slice(5))}월` : `${g.key}년`;
            const isOpen = open === g.key;
            const empty = g.payments.length === 0;
            return (
              <div key={g.key}>
                <button
                  disabled={empty}
                  onClick={() => {
                    if (mode === 'month') { setMonth(g.key); setMode('day'); }
                    else if (mode === 'year') { setYear(g.key); setMode('month'); }
                    else setOpen(isOpen ? null : g.key);
                  }}
                  className={`w-full rounded-2xl px-3 py-3 text-left ${empty ? 'opacity-40' : 'active:bg-fill'}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{label}</span>
                    <span className="text-[15px] font-semibold">{won(g.spent)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(g.spent / max) * 100}%` }} />
                    </div>
                    <span className="w-28 shrink-0 text-right text-xs text-ink-3">
                      {g.count}건{g.benefit > 0 && <b className="text-brand"> · +{won(g.benefit)}</b>}
                    </span>
                  </div>
                </button>
                {mode === 'week' && isOpen && (
                  <div className="mx-2 mb-2 rounded-2xl bg-fill/60">
                    {g.payments.map((p) => <PaymentRow key={p.id} p={p} benefit={benefit.get(p.id) ?? 0} showDate />)}
                  </div>
                )}
              </div>
            );
          })}
        </Panel>
      )}
    </Screen>
  );
}

function PaymentRow({ p, benefit, showDate }: { p: Payment; benefit: number; showDate?: boolean }) {
  const d = new Date(p.paidAt);
  return (
    <Link href={`/new?id=${p.id}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 active:bg-fill">
      <CardChip id={p.cardId} size={32} />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${p.canceled ? 'text-ink-3 line-through' : ''}`}>{p.merchant}</p>
        <p className="text-xs text-ink-3">
          {showDate && `${d.getMonth() + 1}/${d.getDate()} `}
          {d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-semibold ${p.canceled ? 'text-ink-3 line-through' : ''}`}>{won(p.amount)}</p>
        {benefit > 0 && <p className="text-xs font-semibold text-brand">+{won(benefit)}</p>}
      </div>
    </Link>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold ${on ? 'bg-ink text-white' : 'bg-surface text-ink-2'}`}>
      {children}
    </button>
  );
}

function NavBtn({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button aria-label={dir === 'left' ? '이전' : '다음'} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 active:bg-line">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 'left' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'} />
      </svg>
    </button>
  );
}
