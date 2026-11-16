import type { Category } from '@/lib/cards';
import { normalizeCategory } from '@/lib/brands';
import { merchantKey } from '@/lib/merchants';
import type { SupabaseClient } from '@supabase/supabase-js';

/** merchantKey → category the user chose before. */
export async function getMerchantMemory(db: SupabaseClient): Promise<Record<string, Category>> {
  const { data, error } = await db.from('merchant_categories').select('merchant_key, category');
  if (error) throw error;
  const out: Record<string, Category> = {};
  for (const r of data as { merchant_key: string; category: string }[]) out[r.merchant_key] = normalizeCategory(r.category);
  return out;
}

export async function rememberMerchant(db: SupabaseClient, merchant: string, category: Category): Promise<void> {
  const { error } = await db.from('merchant_categories').upsert({ merchant_key: merchantKey(merchant), category });
  if (error) throw error;
}
