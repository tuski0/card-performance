import type { Category } from '@/lib/cards';
import { CATEGORY_LABELS, findBrand } from './brands';

export { CATEGORY_LABELS };

/** Top-level category from the merchant name; 'unknown' when the brand is not known. */
export function guessCategory(merchant: string): Category {
  return findBrand(merchant)?.category ?? 'unknown';
}
