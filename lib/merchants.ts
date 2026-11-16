import type { Category } from '@/lib/cards';
import { CATEGORY_LABELS, findBrand } from './brands';

export { CATEGORY_LABELS };

/** Top-level category from the merchant name; 'unknown' when the brand is not known. */
export function guessCategory(merchant: string): Category {
  return findBrand(merchant)?.category ?? 'unknown';
}

/** Key for remembering a merchant's category: brand id when known, else the name without spaces or a trailing branch word. */
export function merchantKey(merchant: string): string {
  const brand = findBrand(merchant);
  if (brand) return `brand:${brand.id}`;
  return merchant.toLowerCase().replace(/\s+/g, '').replace(/(본|지|분)?점$/, '');
}
