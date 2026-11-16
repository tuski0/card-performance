import Link from 'next/link';
import type { CardId } from '@/lib/cards';

export const CARD_COLORS: Record<CardId, { bg: string; fg: string; short: string }> = {
  'kb-talktalk': { bg: '#ffbc00', fg: '#3d2e00', short: '톡톡' },
  'kb-nara': { bg: '#4a5d3a', fg: '#ffffff', short: '나라' },
  toss: { bg: '#0064ff', fg: '#ffffff', short: '토스' },
  'kb-youth-b': { bg: '#ffd43b', fg: '#3d2e00', short: '청춘' },
};

export function Screen({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <main className={`mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 pt-2 ${className}`}>{children}</main>;
}

export function TopBar({ title, back, right }: { title?: React.ReactNode; back?: string; right?: React.ReactNode }) {
  return (
    <header className="flex h-12 items-center gap-1">
      {back && (
        <Link href={back} aria-label="뒤로" className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-3xl leading-none text-ink-2 active:bg-line">
          ‹
        </Link>
      )}
      {typeof title === 'string' ? <h1 className="text-xl font-bold">{title}</h1> : title}
      <div className="ml-auto">{right}</div>
    </header>
  );
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-surface p-5 ${className}`}>{children}</section>;
}

export function Progress({ value, max, color = 'var(--color-brand)', height = 8 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full overflow-hidden rounded-full bg-fill" style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function CardChip({ id, size = 36 }: { id: CardId; size?: number }) {
  const c = CARD_COLORS[id];
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-end rounded-[7px] p-[3px] text-[9px] font-bold leading-none"
      style={{ width: size, height: Math.round(size * 0.66), background: c.bg, color: c.fg }}
    >
      {c.short}
    </span>
  );
}

export function Badge({ tone, children }: { tone: 'good' | 'warn' | 'bad' | 'brand'; children: React.ReactNode }) {
  const cls = {
    good: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    brand: 'bg-brand-soft text-brand',
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

/** Primary action pinned above the bottom tab bar on phones; inline on desktop. */
export function BottomAction({ children, aboveTabs = true }: { children: React.ReactNode; aboveTabs?: boolean }) {
  return (
    <>
      <div className="h-20 md:hidden" />
      <div className={`fixed inset-x-0 z-10 bg-gradient-to-t from-page from-60% to-transparent px-4 pt-6 md:static md:bg-none md:p-0 ${aboveTabs ? 'bottom-[calc(64px+env(safe-area-inset-bottom))] pb-3' : 'bottom-0 pb-[max(16px,env(safe-area-inset-bottom))]'}`}>
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>
    </>
  );
}

export const primaryBtn = 'flex h-14 w-full items-center justify-center rounded-2xl bg-brand text-[17px] font-semibold text-white active:brightness-95 disabled:opacity-40';
export const secondaryBtn = 'flex h-14 w-full items-center justify-center rounded-2xl bg-fill text-[17px] font-semibold text-ink-2 active:brightness-95';
