import type { CardId } from '@/lib/cards';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Last-4 digits → card, from user_cards.settings.last4. */
export async function getCardNumbers(db: SupabaseClient): Promise<Record<string, CardId>> {
  const { data, error } = await db.from('user_cards').select('card_id, settings');
  if (error) throw error;
  const out: Record<string, CardId> = {};
  for (const r of data as { card_id: CardId; settings: { last4?: string } | null }[]) {
    if (r.settings?.last4) out[r.settings.last4] = r.card_id;
  }
  return out;
}

/** Remembers that `last4` belongs to `cardId`, and forgets it on any other card. */
export async function rememberCardNumber(db: SupabaseClient, cardId: CardId, last4: string): Promise<void> {
  const { data, error } = await db.from('user_cards').select('card_id, settings');
  if (error) throw error;
  const rows = (data as { card_id: CardId; settings: Record<string, unknown> | null }[]) ?? [];
  for (const r of rows) {
    if (r.card_id !== cardId && r.settings?.last4 === last4) {
      const { last4: _drop, ...rest } = r.settings;
      void _drop;
      const { error: e } = await db.from('user_cards').update({ settings: rest }).eq('card_id', r.card_id);
      if (e) throw e;
    }
  }
  const current = rows.find((r) => r.card_id === cardId)?.settings ?? {};
  const { error: e2 } = await db.from('user_cards').upsert({ card_id: cardId, settings: { ...current, last4 } });
  if (e2) throw e2;
}
