export type CardId = 'kb-talktalk' | 'kb-nara' | 'toss' | 'kb-youth-b';

export type Category =
  | 'food' | 'cafe' | 'convenience' | 'transit' | 'telecom' | 'shopping'
  | 'leisure' | 'subscription' | 'overseas' | 'excluded' | 'etc' | 'unknown';

/** `label` is a short name for the condition, e.g. "KB Pay". */
export type Question = { key: string; text: string; label?: string };

export type Payment = {
  id: string;
  cardId: CardId;
  amount: number;
  merchant: string;
  category: Category;
  /** Brand id from lib/brands.ts, or null when the merchant is not a known brand. */
  brand: string | null;
  paidAt: string;
  canceled: boolean;
  answers: Record<string, boolean>;
};

export type Benefit = {
  id: string;
  label: string;
  /** Applies to these top-level categories, or every category. */
  categories?: Category[] | 'all';
  /** Applies to these brand ids. A payment matching either list qualifies. */
  brands?: string[];
  kind: 'discount' | 'cashback';
  rate?: number;
  fixed?: number;
  minAmount?: number;
  monthlyCap?: number;
  monthlyCount?: number;
  /** All listed answers must be true for the benefit to apply. */
  requires?: Question[];
  excludesFromPerformance: boolean;
};

export type Tier = { min: number; totalCap: number | null };

export type CardRule = {
  id: CardId;
  name: string;
  tiers: Tier[];
  benefits: Benefit[];
  performanceExcludedCategories: Category[];
  performanceExcludedBrands?: string[];
  /** Whether discounted payments still count toward performance (card-level switch). */
  discountedCountsToward: boolean;
  newCardGrace?: { untilEndOfNextMonth: true; capRatio?: number; totalCap?: number };
  validUntil?: string;
};
