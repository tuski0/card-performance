import { normalizeCategory } from '@/lib/brands';
import type { CardId, Payment } from '@/lib/cards';
import type { StartBalance } from '@/lib/engine/compute';
import type { SupabaseClient } from '@supabase/supabase-js';

type PaymentRow = {
  id: string; card_id: string; amount: number; merchant: string; category: string; brand: string | null;
  paid_at: string; canceled: boolean; answers: Record<string, boolean>;
};

const toPayment = (r: PaymentRow): Payment => ({
  id: r.id, cardId: r.card_id as CardId, amount: r.amount, merchant: r.merchant,
  category: normalizeCategory(r.category), brand: r.brand ?? null, paidAt: r.paid_at, canceled: r.canceled, answers: r.answers ?? {},
});

/** Payments with paid_at in [from, to). */
export async function listPayments(db: SupabaseClient, range: { from: string; to: string }): Promise<Payment[]> {
  const { data, error } = await db.from('payments').select('*')
    .gte('paid_at', range.from).lt('paid_at', range.to).order('paid_at');
  if (error) throw error;
  return (data as PaymentRow[]).map(toPayment);
}

export async function savePayment(db: SupabaseClient, p: Omit<Payment, 'id'> & { id?: string }): Promise<Payment> {
  const row = {
    ...(p.id ? { id: p.id } : {}),
    card_id: p.cardId, amount: p.amount, merchant: p.merchant, category: p.category, brand: p.brand,
    paid_at: p.paidAt, canceled: p.canceled, answers: p.answers,
  };
  const { data, error } = await db.from('payments').upsert(row).select().single();
  if (error) throw error;
  return toPayment(data as PaymentRow);
}

/** Start balances keyed by card, then month. */
export async function listStarts(db: SupabaseClient): Promise<Partial<Record<CardId, Record<string, StartBalance>>>> {
  const { data, error } = await db.from('month_starts').select('*');
  if (error) throw error;
  const out: Partial<Record<CardId, Record<string, StartBalance>>> = {};
  for (const r of data as { card_id: CardId; month: string; performance: number; benefit_used: Record<string, number> }[]) {
    (out[r.card_id] ??= {})[r.month] = { performance: r.performance, benefitUsed: r.benefit_used ?? {} };
  }
  return out;
}

export async function saveStart(db: SupabaseClient, cardId: CardId, month: string, s: StartBalance): Promise<void> {
  const { error } = await db.from('month_starts')
    .upsert({ card_id: cardId, month, performance: s.performance, benefit_used: s.benefitUsed });
  if (error) throw error;
}

export async function deletePayment(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('payments').delete().eq('id', id);
  if (error) throw error;
}
