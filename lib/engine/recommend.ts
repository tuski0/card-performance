import { CARDS, type CardId, type Category, type Payment } from '@/lib/cards';
import { computeMonth, pendingQuestions, type MonthResult, type StartBalance } from './compute';
import { monthKey } from './month';

export type Recommendation = {
  cardId: CardId;
  /** Discount + cashback this payment would get now, given limits already used this month. */
  benefit: number;
  /** Questions that must be "yes" for that benefit (e.g. pay with KB Pay). */
  conditions: string[];
  eligibility: MonthResult['eligibility'];
};

/** Simulates one payment on each card and ranks them by the benefit it would earn. */
export function recommend(
  target: { brand: string | null; category: Category },
  amount: number,
  at: string,
  payments: Payment[],
  starts: Partial<Record<CardId, Record<string, StartBalance>>>,
  cardIds: CardId[],
): Recommendation[] {
  const month = monthKey(at);
  return cardIds
    .map((cardId) => {
      const questions = pendingQuestions(cardId, target.category, target.brand);
      const probe: Payment = {
        id: '__probe__', cardId, amount, merchant: '', category: target.category, brand: target.brand,
        paidAt: at, canceled: false, answers: Object.fromEntries(questions.map((q) => [q.key, true])),
      };
      const r = computeMonth(cardId, month, [...payments, probe], starts[cardId] ?? {});
      const used = r.benefits.filter((b) => b.applications.some((a) => a.paymentId === probe.id));
      const benefit = used.reduce((s, b) => s + b.applications.filter((a) => a.paymentId === probe.id).reduce((t, a) => t + a.amount, 0), 0);
      // Only list the conditions of benefits that actually applied.
      const conditions = questions
        .filter((q) => CARDS[cardId].benefits.some((b) => used.some((u) => u.id === b.id) && (b.requires ?? []).some((x) => x.key === q.key)))
        .map((q) => q.label ?? q.text);
      return { cardId, benefit, conditions, eligibility: r.eligibility };
    })
    .sort((a, b) => b.benefit - a.benefit);
}
