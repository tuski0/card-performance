import { CARDS, type CardId, type Category } from '@/lib/cards';
import { nextMonth } from './month';

export type Recurring = {
  id: string;
  cardId: CardId;
  amount: number;
  merchant: string;
  category: Category;
  brand: string | null;
  dayOfMonth: number;
  answers: Record<string, boolean>;
  active: boolean;
  startMonth: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Occurrences (YYYY-MM) from startMonth through today that are not recorded yet. Times are 09:00 KST. */
export function dueOccurrences(rec: Recurring, recorded: Set<string>, today: string): { occurrence: string; paidAt: string }[] {
  if (!rec.active) return [];
  const out: { occurrence: string; paidAt: string }[] = [];
  const thisMonth = today.slice(0, 7);
  for (let m = rec.startMonth; m <= thisMonth; m = nextMonth(m)) {
    const [y, mo] = m.split('-').map(Number);
    const day = Math.min(rec.dayOfMonth, new Date(Date.UTC(y, mo, 0)).getUTCDate());
    const date = `${m}-${pad(day)}`;
    if (date > today || recorded.has(m)) continue;
    out.push({ occurrence: m, paidAt: new Date(`${date}T09:00:00+09:00`).toISOString() });
  }
  return out;
}

/** Whole days from `today` to `date` (both YYYY-MM-DD). */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

export type ExpiryNotice = { cardId: CardId; validUntil: string; daysLeft: number };

/** Cards whose benefits end within `windowDays`, or ended up to 30 days ago. */
export function expiryNotices(today: string, windowDays = 30): ExpiryNotice[] {
  return Object.values(CARDS)
    .filter((c) => c.validUntil)
    .map((c) => ({ cardId: c.id, validUntil: c.validUntil!, daysLeft: daysUntil(c.validUntil!, today) }))
    .filter((n) => n.daysLeft <= windowDays && n.daysLeft >= -30);
}

/** Months already handled: everything up to and including `generatedThrough`. */
export function handledMonths(rec: Recurring & { generatedThrough?: string | null }): Set<string> {
  const s = new Set<string>();
  if (!rec.generatedThrough) return s;
  for (let m = rec.startMonth; m <= rec.generatedThrough; m = nextMonth(m)) s.add(m);
  return s;
}
