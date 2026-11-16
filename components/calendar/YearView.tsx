import { short } from '@/lib/format';
import { EMPTY, sumStats, type DayStat } from './shared';

export default function YearView({ year, thisMonth, stats, onPickMonth }: {
  year: string; thisMonth: string; stats: Map<string, DayStat>; onPickMonth: (month: string) => void;
}) {
  const keys = [...stats.keys()];
  return (
    <div className="mt-5 grid grid-cols-3 gap-2">
      {Array.from({ length: 12 }, (_, i) => {
        const m = `${year}-${String(i + 1).padStart(2, '0')}`;
        const s = keys.length ? sumStats(keys.filter((k) => k.startsWith(m)), stats) : EMPTY;
        const cur = m === thisMonth;
        return (
          <button
            key={m}
            onClick={() => onPickMonth(m)}
            aria-label={`${i + 1}월, ${s.spent.toLocaleString('ko-KR')}원 지출`}
            className={`flex h-[86px] flex-col items-start justify-between rounded-2xl p-3 text-left ${cur ? 'bg-brand-soft' : 'bg-fill/70'} active:brightness-95`}
          >
            <span className={`text-[14px] font-semibold ${cur ? 'text-brand' : 'text-ink-2'}`}>{i + 1}월</span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight text-ink">{s.spent > 0 ? short(s.spent) : '-'}</span>
              <span className="block h-3 text-[11px] font-semibold leading-3 text-brand">{s.benefit > 0 ? `+${short(s.benefit)}` : ''}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
