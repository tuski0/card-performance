'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CARD_COLORS, CardChip, Panel, Screen, TopBar } from '@/components/ui';
import { CARDS, type CardId, type Payment } from '@/lib/cards';
import { CATEGORY_LABELS } from '@/lib/brands';
import { useAllPayments } from '@/lib/data/useAllPayments';
import { thisMonth } from '@/lib/data/useMonthData';
import { useOwnedCards } from '@/lib/data/useOwnedCards';
import { byCard, byCategory, byDay, byMonth, topMerchants } from '@/lib/engine/history';
import { monthKey, nextMonth, prevMonth } from '@/lib/engine/month';
import { short, won } from '@/lib/format';
import { merchantKey } from '@/lib/merchants';
import { downloadXlsx } from '@/lib/export';
import { errMsg } from '@/lib/format';

type View = 'list' | 'stats';
type Range = 'month' | 'year';
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function HistoryPage() {
  const { payments, benefit, error } = useAllPayments();
  const ownedIds = useOwnedCards();
  const [view, setView] = useState<View>('list');
  const [range, setRange] = useState<Range>('month');
  const [month, setMonth] = useState(thisMonth());
  const [card, setCard] = useState<CardId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const year = month.slice(0, 4);
  const inPeriod = (p: Payment) => (range === 'month' ? monthKey(p.paidAt) === month : monthKey(p.paidAt).startsWith(`${year}-`));

  // Everything in the period for the chosen card; the search only narrows the list view.
  const periodList = useMemo(
    () => (payments ?? []).filter((p) => (card === 'all' || p.cardId === card) && inPeriod(p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payments, card, range, month],
  );
  const q = merchantKey(query);
  const listed = useMemo(
    () => (q ? periodList.filter((p) => merchantKey(p.merchant).includes(q) || p.merchant.toLowerCase().includes(query.trim().toLowerCase())) : periodList),
    [periodList, q, query],
  );

  const live = periodList.filter((p) => !p.canceled);
  const spent = live.reduce((s, p) => s + p.amount, 0);
  const gained = live.reduce((s, p) => s + (benefit.get(p.id) ?? 0), 0);

  const days = useMemo(() => byDay(listed, month, benefit), [listed, month, benefit]);
  const monthGroupsForYear = useMemo(() => byMonth(periodList, year, benefit), [periodList, year, benefit]);
  const categories = useMemo(() => byCategory(periodList, benefit), [periodList, benefit]);
  const cards = useMemo(() => byCard(periodList, benefit), [periodList, benefit]);
  const top = useMemo(() => topMerchants(periodList, 5), [periodList]);

  // Trend: last 6 months of the viewed month, or the 12 months of the viewed year.
  const trend = useMemo(() => {
    const all = (payments ?? []).filter((p) => card === 'all' || p.cardId === card);
    if (range === 'year') return monthGroupsForYear.map((g) => ({ key: g.key, spent: g.spent }));
    const keys: string[] = [];
    for (let m = month, i = 0; i < 6; i++, m = prevMonth(m)) keys.unshift(m);
    return keys.map((k) => ({
      key: k,
      spent: all.filter((p) => !p.canceled && monthKey(p.paidAt) === k).reduce((s, p) => s + p.amount, 0),
    }));
  }, [payments, card, range, month, monthGroupsForYear]);
  const trendMax = Math.max(1, ...trend.map((t) => t.spent));
  const maxCat = Math.max(1, ...categories.map((c) => c.spent));

  const title = range === 'month' ? `${year}년 ${Number(month.slice(5))}월` : `${year}년 전체`;
  const loading = !payments && !error;

  async function exportFile() {
    setExporting(true);
    setExportError('');
    try {
      const cardPart = card === 'all' ? '' : `_${CARDS[card].name}`;
      const period = range === 'month' ? month : `${year}`;
      await downloadXlsx(periodList, benefit, `카드실적_${period}${cardPart}.xlsx`);
    } catch (e) {
      setExportError(errMsg(e, '파일을 만들지 못했어요'));
    } finally {
      setExporting(false);
    }
  }

  function step(dir: -1 | 1) {
    if (range === 'month') setMonth(dir < 0 ? prevMonth(month) : nextMonth(month));
    else setMonth(`${Number(year) + dir}-${month.slice(5)}`);
  }

  return (
    <Screen>
      <TopBar
        title="내역"
        right={
          <button onClick={exportFile} disabled={!payments || periodList.length === 0 || exporting}
            className="rounded-full bg-surface px-3 py-2 text-[13px] font-semibold text-ink-2 disabled:opacity-40">
            {exporting ? '만드는 중…' : '엑셀로 내보내기'}
          </button>
        }
      />
      {exportError && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{exportError}</p>}

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1" role="tablist" aria-label="보기">
        {([['list', '목록'], ['stats', '통계']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)}
            className={`h-10 rounded-xl text-[14px] font-semibold transition-colors ${view === id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip on={card === 'all'} onClick={() => setCard('all')}>전체 카드</Chip>
        {ownedIds.map((id) => (
          <Chip key={id} on={card === id} onClick={() => setCard(id)}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CARD_COLORS[id].bg }} />
            {CARD_COLORS[id].short}
          </Chip>
        ))}
      </div>

      <Panel className="!py-4">
        <div className="flex items-center justify-between">
          <div className="-ml-2 flex items-center">
            <Nav dir="left" onClick={() => step(-1)} />
            <span className="min-w-[110px] text-center text-[15px] font-semibold">{title}</span>
            <Nav dir="right" onClick={() => step(1)} />
          </div>
          <button onClick={() => setRange(range === 'month' ? 'year' : 'month')} aria-pressed={range === 'year'}
            className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${range === 'year' ? 'bg-ink text-white' : 'bg-fill text-ink-2'}`}>
            올해 전체
          </button>
        </div>
        <div className="mt-3 flex items-end gap-5">
          <div>
            <p className="text-[13px] text-ink-3">지출</p>
            <p className="text-[22px] font-bold tracking-tight">{payments ? won(spent) : '—'}</p>
          </div>
          <div>
            <p className="text-[13px] text-ink-3">받은 혜택</p>
            <p className="text-[22px] font-bold tracking-tight text-brand">{payments ? `+${won(gained)}` : '—'}</p>
          </div>
          <p className="ml-auto pb-1 text-[13px] text-ink-3">{live.length}건</p>
        </div>
      </Panel>

      {error && <Panel><p className="text-sm text-bad">{error}</p></Panel>}
      {loading && <Panel><p className="text-ink-3">불러오는 중…</p></Panel>}

      {payments && view === 'list' && (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="가맹점 이름으로 검색" aria-label="가맹점 검색"
            className="input !bg-surface" />
          {range === 'year' && (
            <p className="px-1 text-xs text-ink-3">연간 보기에서는 월별로 묶어 보여줘요. 달을 누르면 그 달의 목록으로 가요.</p>
          )}
          {range === 'month' && days.length === 0 && (
            <Panel><p className="py-6 text-center text-ink-3">{query ? '검색 결과가 없어요' : '이 기간에 기록한 결제가 없어요'}</p></Panel>
          )}
          {range === 'month' && days.map((g) => (
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
          {range === 'year' && (
            <Panel className="!px-2 !py-2">
              {byMonth(listed, year, benefit).map((g) => (
                <button key={g.key} disabled={g.payments.length === 0}
                  onClick={() => { setMonth(g.key); setRange('month'); }}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left ${g.payments.length === 0 ? 'opacity-40' : 'active:bg-fill'}`}>
                  <span className="font-semibold">{Number(g.key.slice(5))}월</span>
                  <span className="text-[13px] text-ink-3">
                    {g.count}건 · <b className="text-[15px] text-ink">{won(g.spent)}</b>{g.benefit > 0 && <b className="text-brand"> · +{won(g.benefit)}</b>}
                  </span>
                </button>
              ))}
            </Panel>
          )}
        </>
      )}

      {payments && view === 'stats' && (
        live.length === 0 ? (
          <Panel><p className="py-6 text-center text-ink-3">이 기간에 기록한 결제가 없어요</p></Panel>
        ) : (
          <>
            <Panel>
              <h2 className="mb-3 text-[15px] font-semibold">분류별 지출</h2>
              <div className="flex flex-col gap-3">
                {categories.map((c) => (
                  <div key={c.category}>
                    <div className="flex items-baseline justify-between text-[14px]">
                      <span className="font-medium">{CATEGORY_LABELS[c.category]}</span>
                      <span><b>{won(c.spent)}</b> <span className="text-ink-3">{Math.round((c.spent / spent) * 100)}%</span></span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fill">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(c.spent / maxCat) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <h2 className="mb-2 text-[15px] font-semibold">카드별</h2>
              {cards.map((c) => (
                <div key={c.cardId} className="flex items-center gap-3 py-2">
                  <CardChip id={c.cardId} size={32} />
                  <span className="min-w-0 flex-1 truncate font-medium">{CARDS[c.cardId].name}</span>
                  <span className="shrink-0 text-right">
                    <b className="block">{won(c.spent)}</b>
                    {c.benefit > 0 && <span className="text-xs font-semibold text-brand">+{won(c.benefit)}</span>}
                  </span>
                </div>
              ))}
            </Panel>

            <Panel>
              <h2 className="mb-2 text-[15px] font-semibold">많이 쓴 곳</h2>
              {top.map((t, i) => (
                <div key={t.name} className="flex items-center gap-3 py-2">
                  <span className="w-5 text-center text-[13px] font-bold text-ink-3">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  <span className="text-[13px] text-ink-3">{t.count}번</span>
                  <b className="w-24 shrink-0 text-right">{won(t.spent)}</b>
                </div>
              ))}
            </Panel>

            <Panel>
              <h2 className="mb-3 text-[15px] font-semibold">월별 지출</h2>
              <div className="flex h-36 items-end gap-1.5" role="img" aria-label="월별 지출 막대 그래프">
                {trend.map((t) => (
                  <div key={t.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-semibold leading-3 text-ink-2">{t.spent > 0 ? short(t.spent) : ''}</span>
                    <div className={`w-full rounded-t-lg ${t.key === month ? 'bg-brand' : 'bg-brand/30'}`} style={{ height: `${Math.max(t.spent > 0 ? 4 : 0, (t.spent / trendMax) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-1.5">
                {trend.map((t) => <span key={t.key} className="flex-1 text-center text-[11px] text-ink-3">{Number(t.key.slice(5))}월</span>)}
              </div>
            </Panel>
          </>
        )
      )}
    </Screen>
  );
}

function PaymentRow({ p, benefit }: { p: Payment; benefit: number }) {
  const d = new Date(p.paidAt);
  return (
    <Link href={`/new?id=${p.id}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 active:bg-fill">
      <CardChip id={p.cardId} size={32} />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${p.canceled ? 'text-ink-3 line-through' : ''}`}>{p.merchant}</p>
        <p className="text-xs text-ink-3">
          {d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · {CATEGORY_LABELS[p.category]}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`font-semibold ${p.canceled ? 'text-ink-3 line-through' : ''}`}>{won(p.amount)}</p>
        {benefit > 0 && <p className="text-xs font-semibold text-brand">+{won(benefit)}</p>}
      </div>
    </Link>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold ${on ? 'bg-ink text-white' : 'bg-surface text-ink-2'}`}>
      {children}
    </button>
  );
}

function Nav({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button aria-label={dir === 'left' ? '이전' : '다음'} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 active:bg-line">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === 'left' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'} />
      </svg>
    </button>
  );
}
