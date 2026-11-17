import type { CardId, Category, Payment } from '@/lib/cards';
import { findBrand } from '@/lib/brands';
import { guessCategory, merchantKey } from '@/lib/merchants';
import { findCancelCandidates, parsePaymentText } from '@/lib/parse';

export type IngestContext = {
  /** last4 → card */
  cardNumbers: Record<string, CardId>;
  /** merchantKey → category */
  merchantMemory: Record<string, Category>;
  /** Payments from the last 31 days. */
  recent: Payment[];
};

export type IngestAction =
  | { kind: 'record'; payment: Omit<Payment, 'id'> }
  | { kind: 'cancel'; paymentId: string }
  | { kind: 'inbox'; reason: 'no-card' | 'no-cancel-target' | 'no-merchant' }
  | { kind: 'ignore' };

/** Decide what to do with a card notification: record it, cancel a payment, park it in the inbox, or ignore it. */
export function decideIngest(text: string, ctx: IngestContext, postedAt: Date): IngestAction {
  const p = parsePaymentText(text, postedAt);
  if (p.amount === undefined) return { kind: 'ignore' };

  const cardId = p.cardId ?? (p.last4 ? ctx.cardNumbers[p.last4] : undefined);
  if (!cardId) return { kind: 'inbox', reason: 'no-card' };
  if (!p.merchant) return { kind: 'inbox', reason: 'no-merchant' };

  const paidAt = p.paidAt ?? postedAt.toISOString();
  if (p.canceled) {
    // Only an unambiguous match may cancel; zero or several candidates go to the inbox for a human.
    const hits = findCancelCandidates(ctx.recent, { amount: p.amount, merchant: p.merchant, paidAt, cardId });
    return hits.length === 1 ? { kind: 'cancel', paymentId: hits[0].id } : { kind: 'inbox', reason: 'no-cancel-target' };
  }

  const brand = findBrand(p.merchant);
  const category = ctx.merchantMemory[merchantKey(p.merchant)] ?? brand?.category ?? guessCategory(p.merchant);
  return {
    kind: 'record',
    payment: { cardId, amount: p.amount, merchant: p.merchant, category, brand: brand?.id ?? null, paidAt, canceled: false, answers: {}, source: 'notification' },
  };
}
