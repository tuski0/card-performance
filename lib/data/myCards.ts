import type { CardId } from '@/lib/cards';
import type { SupabaseClient } from '@supabase/supabase-js';

export type MyCardRow = { cardId: CardId; owned: boolean; last4: string | null };

export async function getMyCards(db: SupabaseClient): Promise<MyCardRow[]> {
  const { data, error } = await db.from('user_cards').select('card_id, owned, settings');
  if (error) throw error;
  return (data as { card_id: CardId; owned: boolean; settings: { last4?: string } | null }[]).map((r) => ({
    cardId: r.card_id, owned: r.owned, last4: r.settings?.last4 ?? null,
  }));
}

/** Turns a card on or off without touching its saved settings (last4). */
export async function setOwned(db: SupabaseClient, cardId: CardId, owned: boolean): Promise<void> {
  const { data, error } = await db.from('user_cards').select('card_id').eq('card_id', cardId);
  if (error) throw error;
  const q = data && data.length > 0
    ? db.from('user_cards').update({ owned }).eq('card_id', cardId)
    : db.from('user_cards').insert({ card_id: cardId, owned });
  const { error: e2 } = await q;
  if (e2) throw e2;
}

export async function clearLast4(db: SupabaseClient, cardId: CardId): Promise<void> {
  const { data, error } = await db.from('user_cards').select('settings').eq('card_id', cardId).maybeSingle();
  if (error) throw error;
  const { last4: _drop, ...rest } = ((data?.settings as Record<string, unknown>) ?? {});
  void _drop;
  const { error: e2 } = await db.from('user_cards').update({ settings: rest }).eq('card_id', cardId);
  if (e2) throw e2;
}

export async function requestCard(db: SupabaseClient, cardName: string, note: string): Promise<void> {
  const { error } = await db.from('card_requests').insert({ card_name: cardName.trim(), note: note.trim() || null });
  if (error) throw error;
}
