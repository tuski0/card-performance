import { weekOf } from '@/lib/engine/month';
import { short, won } from '@/lib/format';
import { WEEK_LABELS, type DayStat } from './shared';

export default function WeekView({ selected, today, stats, onSelect }: {
  selected: string; today: string; stats: Map<string, DayStat>; onSelect: (day: string) => void;
}) {
  const week = weekOf(selected);
  const selMonth = selected.slice(0, 7);
  return (
    <div className="mt-5 grid grid-cols-7 gap-0.5">
      {week.map((key, i) => {
        const d = stats.get(key);
        const isSel = key === selected;
        const isToday = key === today;
        const outside = key.slice(0, 7) !== selMonth;
        const day = Number(key.slice(8));
        const color = isSel ? 'text-white' : isToday ? 'text-brand' : i === 0 ? 'text-[#f04452]' : i === 6 ? 'text-[#3182f6]/80' : 'text-ink';
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            aria-pressed={isSel}
            aria-label={`${Number(key.slice(5, 7))}월 ${day}일${d ? `, ${won(d.spent)} 지출` : ''}`}
            className={`group flex min-h-[112px] flex-col items-center gap-1 rounded-2xl pb-2 pt-2 ${isSel ? 'bg-brand-soft' : 'hover:bg-fill/60'} ${outside ? 'opacity-60' : ''}`}
          >
            <span className="text-[12px] font-medium text-ink-3">{WEEK_LABELS[i]}</span>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-semibold ${isSel ? 'bg-brand' : ''} ${color}`}>{day}</span>
            {day === 1 && <span className="text-[10px] text-ink-3">{Number(key.slice(5, 7))}월</span>}
            <span className="mt-1 text-[12px] font-bold leading-[14px] tracking-tight text-ink">{d && d.spent > 0 ? short(d.spent) : ''}</span>
            <span className="text-[10px] font-semibold leading-3 text-brand">{d && d.benefit > 0 ? `+${short(d.benefit)}` : ''}</span>
            {d && d.count > 0 && <span className="text-[10px] text-ink-3">{d.count}건</span>}
          </button>
        );
      })}
    </div>
  );
}
