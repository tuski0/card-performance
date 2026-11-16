import { BRANDS } from '@/lib/brands';
import { CARDS, type CardId, type Category, type Payment } from '@/lib/cards';
import { merchantKey } from '@/lib/merchants';
import { computeMonth, type StartBalance } from './compute';
import { dayKey, monthKey, monthShape } from './month';

export type Group = { key: string; spent: number; benefit: number; count: number; payments: Payment[] };
export type WeekGroup = Group & { from: string; to: string };

function sum(key: string, list: Payment[], benefit: Map<string, number>): Group {
  const live = list.filter((p) => !p.canceled);
  return {
    key,
    spent: live.reduce((s, p) => s + p.amount, 0),
    benefit: live.reduce((s, p) => s + (benefit.get(p.id) ?? 0), 0),
    count: live.length,
    payments: [...list].sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
  };
}

function bucket(payments: Payment[], keyOf: (p: Payment) => string | null): Map<string, Payment[]> {
  const m = new Map<string, Payment[]>();
  for (const p of payments) {
    const k = keyOf(p);
    if (k === null) continue;
    m.set(k, [...(m.get(k) ?? []), p]);
  }
  return m;
}

/** Days of `month` that have records, newest first. */
export function byDay(payments: Payment[], month: string, benefit: Map<string, number>): Group[] {
  const m = bucket(payments, (p) => (monthKey(p.paidAt) === month ? dayKey(p.paidAt) : null));
  return [...m.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([k, v]) => sum(k, v, benefit));
}

/** Sunday-start weeks of `month`, clipped to the month, oldest first. */
export function byWeek(payments: Payment[], month: string, benefit: Map<string, number>): WeekGroup[] {
  const { firstWeekday, days } = monthShape(month);
  const pad = (d: number) => `${month}-${String(d).padStart(2, '0')}`;
  const weeks: WeekGroup[] = [];
  for (let start = 1; start <= days; ) {
    const end = Math.min(days, start === 1 ? 7 - firstWeekday : start + 6);
    const from = pad(start);
    const to = pad(end);
    const list = payments.filter((p) => { const d = dayKey(p.paidAt); return d >= from && d <= to; });
    weeks.push({ ...sum(from, list, benefit), from, to });
    start = end + 1;
  }
  return weeks;
}

/** All 12 months of `year`. */
export function byMonth(payments: Payment[], year: string, benefit: Map<string, number>): Group[] {
  const m = bucket(payments, (p) => (monthKey(p.paidAt).startsWith(`${year}-`) ? monthKey(p.paidAt) : null));
  return Array.from({ length: 12 }, (_, i) => {
    const k = `${year}-${String(i + 1).padStart(2, '0')}`;
    return sum(k, m.get(k) ?? [], benefit);
  });
}

/** Years that have records, newest first. */
export function byYear(payments: Payment[], benefit: Map<string, number>): Group[] {
  const m = bucket(payments, (p) => monthKey(p.paidAt).slice(0, 4));
  return [...m.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([k, v]) => sum(k, v, benefit));
}

/** Discount + cashback per payment, computed month by month for every card. */
export function benefitMap(
  payments: Payment[],
  starts: Partial<Record<CardId, Record<string, StartBalance>>>,
): Map<string, number> {
  const out = new Map<string, number>();
  const pairs = new Set(payments.map((p) => `${p.cardId}|${monthKey(p.paidAt)}`));
  for (const pair of pairs) {
    const [cardId, month] = pair.split('|') as [CardId, string];
    if (!CARDS[cardId]) continue;
    const r = computeMonth(cardId, month, payments, starts[cardId] ?? {});
    for (const b of r.benefits) for (const a of b.applications) out.set(a.paymentId, (out.get(a.paymentId) ?? 0) + a.amount);
  }
  return out;
}

export type Stat<K> = { spent: number; benefit: number; count: number } & K;

function tally<K extends string>(payments: Payment[], keyOf: (p: Payment) => K, benefit: Map<string, number>) {
  const m = new Map<K, { spent: number; benefit: number; count: number }>();
  for (const p of payments) {
    if (p.canceled) continue;
    const k = keyOf(p);
    const cur = m.get(k) ?? { spent: 0, benefit: 0, count: 0 };
    m.set(k, { spent: cur.spent + p.amount, benefit: cur.benefit + (benefit.get(p.id) ?? 0), count: cur.count + 1 });
  }
  return [...m.entries()].sort(([, a], [, b]) => b.spent - a.spent);
}

export function byCategory(payments: Payment[], benefit: Map<string, number>): Stat<{ category: Category }>[] {
  return tally(payments, (p) => p.category, benefit).map(([category, v]) => ({ category, ...v }));
}

export function byCard(payments: Payment[], benefit: Map<string, number>): Stat<{ cardId: CardId }>[] {
  return tally(payments, (p) => p.cardId, benefit).map(([cardId, v]) => ({ cardId, ...v }));
}

/** Most-spent merchants: brand name when known, else merchants with the same key are merged. */
export function topMerchants(payments: Payment[], limit = 5): { name: string; spent: number; count: number }[] {
  const names = new Map<string, string>();
  const rows = tally(
    payments,
    (p) => {
      const key = p.brand ? `brand:${p.brand}` : merchantKey(p.merchant);
      if (!names.has(key)) names.set(key, p.brand ? (BRANDS.find((b) => b.id === p.brand)?.name ?? p.merchant) : p.merchant.trim());
      return key;
    },
    new Map(),
  );
  return rows.slice(0, limit).map(([key, v]) => ({ name: names.get(key) ?? key, spent: v.spent, count: v.count }));
}
