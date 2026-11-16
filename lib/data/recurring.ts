import { normalizeCategory } from '@/lib/brands';
import type { CardId } from '@/lib/cards';
import { dayKey } from '@/lib/engine/month';
import { dueOccurrences, handledMonths, type Recurring } from '@/lib/engine/schedule';
import type { SupabaseClient } from '@supabase/supabase-js';

export type RecurringRow = Recurring & { generatedThrough: string | null };

type Row = {
  id: string; card_id: string; amount: number; merchant: string; category: string; brand: string | null; day_of_month: number;
  answers: Record<string, boolean>; active: boolean; start_month: string; generated_through: string | null;
};

const fromRow = (r: Row): RecurringRow => ({
  id: r.id, cardId: r.card_id as CardId, amount: r.amount, merchant: r.merchant, category: normalizeCategory(r.category), brand: r.brand ?? null,
  dayOfMonth: r.day_of_month, answers: r.answers ?? {}, active: r.active, startMonth: r.start_month,
  generatedThrough: r.generated_through,
});

export async function listRecurring(db: SupabaseClient): Promise<RecurringRow[]> {
  const { data, error } = await db.from('recurring_payments').select('*').order('day_of_month');
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function saveRecurring(
  db: SupabaseClient,
  r: Omit<Recurring, 'id'> & { id?: string; generatedThrough?: string | null },
): Promise<void> {
  const row = {
    ...(r.id ? { id: r.id } : {}),
    card_id: r.cardId, amount: r.amount, merchant: r.merchant, category: r.category, brand: r.brand,
    day_of_month: r.dayOfMonth, answers: r.answers, active: r.active, start_month: r.startMonth,
    ...(r.generatedThrough !== undefined ? { generated_through: r.generatedThrough } : {}),
  };
  const { error } = await db.from('recurring_payments').upsert(row);
  if (error) throw error;
}

export async function deleteRecurring(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('recurring_payments').delete().eq('id', id);
  if (error) throw error;
}

/** Records every due occurrence and advances generated_through. Returns how many payments were created. */
export async function generateDue(db: SupabaseClient, now = new Date()): Promise<number> {
  const today = dayKey(now.toISOString());
  const list = await listRecurring(db);
  let created = 0;
  for (const rec of list) {
    const due = dueOccurrences(rec, handledMonths(rec), today);
    if (due.length === 0) continue;
    for (const d of due) {
      const { error } = await db.from('payments').insert({
        card_id: rec.cardId, amount: rec.amount, merchant: rec.merchant, category: rec.category, brand: rec.brand,
        paid_at: d.paidAt, canceled: false, answers: rec.answers, recurring_id: rec.id, occurrence: d.occurrence,
      });
      // 23505: another device already created this month's payment; treat as done.
      if (error && error.code !== '23505') throw error;
      if (!error) created += 1;
    }
    const last = due[due.length - 1].occurrence;
    const { error: e2 } = await db.from('recurring_payments').update({ generated_through: last }).eq('id', rec.id);
    if (e2) throw e2;
  }
  return created;
}
