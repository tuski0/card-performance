import Link from 'next/link';
import type { CardId } from '@/lib/cards';

/**
 * Per-card look. `bg` is the solid colour used for dots and legends; `from`/`to` paint the card face.
 * Colours only evoke each card; they are not copies of the issuers' designs.
 */
export const CARD_COLORS: Record<CardId, { bg: string; from: string; to: string; fg: string; short: string; issuer: string }> = {
  'kb-talktalk': { bg: '#ffbc00', from: '#ffd84d', to: '#ffaa00', fg: '#3d2e00', short: '톡톡', issuer: 'KB' },
  'kb-nara': { bg: '#56693f', from: '#6f8552', to: '#34452a', fg: '#ffffff', short: '나라', issuer: 'KB' },
  toss: { bg: '#1b64f2', from: '#3d84ff', to: '#0b4fd9', fg: '#ffffff', short: '토스', issuer: 'toss' },
  'kb-youth-b': { bg: '#ff7a3d', from: '#ff9a52', to: '#f2552c', fg: '#ffffff', short: '청춘', issuer: 'KB' },
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

/** Small card face: gradient, IC chip, and (when big enough) the issuer mark and short name. */
export function CardChip({ id, size = 36 }: { id: CardId; size?: number }) {
  const c = CARD_COLORS[id];
  const h = Math.round(size * 0.63);
  const showText = size >= 30;
  return (
    <span
      aria-hidden
      className="relative inline-block shrink-0 overflow-hidden"
      style={{
        width: size, height: h, borderRadius: Math.max(4, size * 0.13), color: c.fg,
        background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.12)',
      }}
    >
      {/* soft sheen across the face */}
      <span className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 45%)' }} />
      {/* IC chip */}
      <span
        className="absolute"
        style={{
          left: size * 0.1, top: h * 0.3, width: size * 0.2, height: h * 0.24, borderRadius: Math.max(1, size * 0.03),
          background: 'linear-gradient(135deg, #f5dc8a, #c9a24a)', boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.25)',
        }}
      />
      {showText && (
        <>
          <span className="absolute font-extrabold leading-none" style={{ right: size * 0.08, top: h * 0.1, fontSize: size * 0.16, opacity: 0.9 }}>
            {c.issuer}
          </span>
          <span className="absolute font-bold leading-none" style={{ left: size * 0.1, bottom: h * 0.12, fontSize: size * 0.2 }}>
            {c.short}
          </span>
        </>
      )}
    </span>
  );
}

/** Large card face for a card's own page. */
export function CardFace({ id, name, last4 }: { id: CardId; name: string; last4?: string | null }) {
  const c = CARD_COLORS[id];
  return (
    <div
      aria-hidden
      className="relative mx-auto aspect-[1.586] w-full max-w-[320px] overflow-hidden rounded-[18px] p-5"
      style={{
        color: c.fg, background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06), 0 10px 24px -8px rgba(0,0,0,0.35)',
      }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 42%)' }} />
      <div className="absolute -right-10 -bottom-16 h-48 w-48 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="text-[13px] font-semibold opacity-90">{name}</span>
          <span className="text-[18px] font-extrabold leading-none">{c.issuer}</span>
        </div>
        <span className="block h-8 w-11 rounded-md" style={{ background: 'linear-gradient(135deg, #f5dc8a, #c9a24a)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' }} />
        <div className="flex items-end justify-between">
          <span className="text-[15px] font-semibold tracking-[0.2em] opacity-90">{last4 ? `•••• ${last4}` : '•••• ••••'}</span>
          <span className="text-[13px] font-bold">{c.short}</span>
        </div>
      </div>
    </div>
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
