import { CARDS, type Benefit, type CardId, type CardRule, type Category, type Payment, type Question, type Tier } from '@/lib/cards';
import { dayKey, monthKey, prevMonth } from './month';

/**
 * What the user typed in for a month. `isTotal`: `performance` is the card statement's figure for the whole month,
 * so recorded payments are not added on top. Otherwise it is performance from before recording started.
 */
export type StartBalance = { performance: number; benefitUsed: Record<string, number>; isTotal?: boolean };
export type Starts = Record<string, StartBalance | undefined>;

export type BenefitResult = {
  id: string;
  label: string;
  kind: Benefit['kind'];
  used: number;
  cap: number | null;
  remaining: number | null;
  applications: { paymentId: string; amount: number }[];
};

export type MonthResult = {
  cardId: CardId;
  month: string;
  performance: number;
  target: number | null;
  remainingToTarget: number | null;
  eligibility: 'eligible' | 'ineligible' | 'unknown';
  scope: 'recorded-only' | 'with-start';
  benefits: BenefitResult[];
};

const NEVER_BENEFIT: Category[] = ['unknown', 'excluded', 'overseas'];

function matches(b: Benefit, p: Payment): boolean {
  if (NEVER_BENEFIT.includes(p.category)) return false;
  const byBrand = p.brand !== null && (b.brands ?? []).includes(p.brand);
  const byCategory = b.categories === 'all' || (b.categories ?? []).includes(p.category);
  if (!byBrand && !byCategory) return false;
  if (b.minAmount !== undefined && p.amount < b.minAmount) return false;
  return (b.requires ?? []).every((q) => p.answers[q.key] === true);
}

/** Highest tier reached, or null when below every tier. */
function tierFor(card: CardRule, performance: number): Tier | null {
  return [...card.tiers].reverse().find((t) => performance >= t.min) ?? null;
}

function nextTarget(card: CardRule, performance: number): number | null {
  const mins = card.tiers.map((t) => t.min).filter((m) => m > 0);
  if (mins.length === 0) return null;
  return mins.find((m) => m > performance) ?? mins[mins.length - 1];
}

/** `depth` only guards against runaway recursion; history is followed until a month has no records. */
export function computeMonth(cardId: CardId, month: string, payments: Payment[], starts: Starts, depth = 120): MonthResult {
  const card = CARDS[cardId];
  const mine = payments.filter((p) => p.cardId === cardId);
  const start = starts[month];

  // Eligibility from last month's performance.
  const prev = prevMonth(month);
  const prevKnown = starts[prev] !== undefined || mine.some((p) => monthKey(p.paidAt) === prev);
  let tier: Tier | null;
  let eligibility: MonthResult['eligibility'];
  if (card.tiers.every((t) => t.min === 0)) {
    tier = card.tiers[0];
    eligibility = 'eligible';
  } else if (!prevKnown || depth === 0) {
    tier = card.tiers[0]; // show benefits as if the base tier applies
    eligibility = 'unknown';
  } else {
    tier = tierFor(card, computeMonth(cardId, prev, payments, starts, depth - 1).performance);
    eligibility = tier ? 'eligible' : 'ineligible';
  }

  const results: BenefitResult[] = card.benefits.map((b) => {
    const used = start?.benefitUsed[b.id] ?? 0;
    return { id: b.id, label: b.label, kind: b.kind, used, cap: b.monthlyCap ?? null, remaining: null, applications: [] };
  });
  const counts: Record<string, number> = {};
  let totalLeft = tier?.totalCap ?? Infinity;
  totalLeft -= results.reduce((s, r) => s + r.used, 0);

  let performance = start?.performance ?? 0;
  const active = mine
    .filter((p) => !p.canceled && monthKey(p.paidAt) === month)
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt));

  for (const p of active) {
    let excludeFromPerformance =
      card.performanceExcludedCategories.includes(p.category) ||
      (p.brand !== null && (card.performanceExcludedBrands ?? []).includes(p.brand));
    const expired = card.validUntil !== undefined && dayKey(p.paidAt) > card.validUntil;
    if (tier && !expired) {
      card.benefits.forEach((b, i) => {
        if (!matches(b, p)) return;
        const r = results[i];
        if (b.monthlyCount !== undefined && (counts[b.id] ?? 0) >= b.monthlyCount) return;
        const raw = b.fixed ?? Math.floor(p.amount * (b.rate ?? 0));
        const capLeft = b.monthlyCap !== undefined ? b.monthlyCap - r.used : Infinity;
        const amount = Math.max(0, Math.min(raw, capLeft, totalLeft));
        if (amount <= 0) return;
        r.used += amount;
        r.applications.push({ paymentId: p.id, amount });
        counts[b.id] = (counts[b.id] ?? 0) + 1;
        if (b.kind === 'discount') totalLeft -= amount;
        if (b.kind === 'discount' && (b.excludesFromPerformance || !card.discountedCountsToward)) excludeFromPerformance = true;
      });
    }
    if (!excludeFromPerformance && !start?.isTotal) performance += p.amount;
  }

  for (const r of results) r.remaining = r.cap === null ? null : Math.max(0, r.cap - r.used);

  const target = nextTarget(card, performance);
  return {
    cardId,
    month,
    performance,
    target,
    remainingToTarget: target === null ? null : Math.max(0, target - performance),
    eligibility,
    scope: start ? 'with-start' : 'recorded-only',
    benefits: results,
  };
}

/** True when saving moved performance across any tier threshold. */
export function crossesTarget(before: MonthResult, after: MonthResult): boolean {
  return CARDS[after.cardId].tiers.some((t) => t.min > 0 && before.performance < t.min && after.performance >= t.min);
}

/** Extra yes/no questions needed to judge benefits for this card and category. */
export function pendingQuestions(cardId: CardId, category: Category, brand: string | null = null): Question[] {
  if (NEVER_BENEFIT.includes(category)) return [];
  const seen = new Map<string, Question>();
  for (const b of CARDS[cardId].benefits) {
    const byBrand = brand !== null && (b.brands ?? []).includes(brand);
    const byCategory = b.categories === 'all' || (b.categories ?? []).includes(category);
    if (!byBrand && !byCategory) continue;
    for (const q of b.requires ?? []) seen.set(q.key, q);
  }
  return [...seen.values()];
}
