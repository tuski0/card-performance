import Link from 'next/link';
import { CardChip } from '@/components/ui';
import { CARDS, type Payment } from '@/lib/cards';
import { won } from '@/lib/format';

export type DayStat = { spent: number; benefit: number; count: number };
export const EMPTY: DayStat = { spent: 0, benefit: 0, count: 0 };
export const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function sumStats(keys: string[], stats: Map<string, DayStat>): DayStat {
  return keys.reduce((t, k) => {
    const s = stats.get(k) ?? EMPTY;
    return { spent: t.spent + s.spent, benefit: t.benefit + s.benefit, count: t.count + s.count };
  }, EMPTY);
}

export function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === 'left' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'} />
    </svg>
  );
}

/** The selected day's payments, newest first, each with the benefit it earned. */
export function DayList({ title, spent, payments, benefit, loading }: {
  title: string; spent: number; payments: Payment[]; benefit: Map<string, number>; loading: boolean;
}) {
  return (
    <section className="rounded-3xl bg-surface p-5 !px-2 !py-3">
      <div className="flex items-baseline justify-between px-3 pb-1 pt-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {spent > 0 && <span className="text-[13px] text-ink-3">{won(spent)}</span>}
      </div>
      {loading && <p className="px-3 py-6 text-center text-ink-3">불러오는 중…</p>}
      {!loading && payments.length === 0 && <p className="px-3 py-6 text-center text-ink-3">이날 기록한 결제가 없어요</p>}
      {payments.map((p) => {
        const b = benefit.get(p.id) ?? 0;
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
    </section>
  );
}
