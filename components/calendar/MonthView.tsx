import { monthShape } from '@/lib/engine/month';
import { short, won } from '@/lib/format';
import { WEEK_LABELS, type DayStat } from './shared';

export default function MonthView({ month, selected, today, stats, onSelect }: {
  month: string; selected: string; today: string; stats: Map<string, DayStat>; onSelect: (day: string) => void;
}) {
  const { firstWeekday, days } = monthShape(month);
  const mm = Number(month.slice(5));
  return (
    <>
      <div className="mt-5 grid grid-cols-7 text-center text-[12px] font-medium text-ink-3">
        {WEEK_LABELS.map((w, i) => (
          <span key={w} className={i === 0 ? 'text-[#f9787f]' : i === 6 ? 'text-[#76abf8]' : ''}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7">
        {Array.from({ length: firstWeekday }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, '0')}`;
          const d = stats.get(key);
          const isSel = key === selected;
          const isToday = key === today;
          const wd = (firstWeekday + i) % 7;
          const numColor = isSel ? 'text-white' : isToday ? 'text-brand' : wd === 0 ? 'text-[#f04452]' : wd === 6 ? 'text-[#3182f6]/80' : 'text-ink';
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              aria-pressed={isSel}
              aria-label={`${mm}월 ${i + 1}일${d ? `, ${won(d.spent)} 지출` : ''}`}
              className="group flex h-[66px] flex-col items-center gap-0.5 pt-1 md:h-[76px]"
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-semibold transition-colors ${isSel ? 'bg-brand' : 'group-hover:bg-fill'} ${numColor}`}>{i + 1}</span>
              <span className="h-3.5 text-[12px] font-bold leading-[14px] tracking-tight text-ink">{d && d.spent > 0 ? short(d.spent) : ''}</span>
              <span className="h-3 text-[10px] font-semibold leading-3 text-brand">{d && d.benefit > 0 ? `+${short(d.benefit)}` : ''}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
