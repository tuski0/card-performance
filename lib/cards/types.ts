export type CardId = 'kb-talktalk' | 'kb-nara' | 'toss' | 'kb-youth-b';

export type Category =
  | 'starbucks' | 'burger' | 'convenience' | 'transit' | 'taxi' | 'telecom'
  | 'cgv' | 'themepark' | 'family_restaurant' | 'bookstore' | 'language_test'
  | 'shopping_membership' | 'fashion' | 'life' | 'delivery'
  | 'overseas' | 'excluded' | 'other' | 'unknown';

export type Question = { key: string; text: string };

export type Payment = {
  id: string;
  cardId: CardId;
  amount: number;
  merchant: string;
  category: Category;
  paidAt: string;
  canceled: boolean;
  answers: Record<string, boolean>;
};

export type Benefit = {
  id: string;
  label: string;
  categories: Category[] | 'all';
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
  /** Whether discounted payments still count toward performance (card-level switch). */
  discountedCountsToward: boolean;
  newCardGrace?: { untilEndOfNextMonth: true; capRatio?: number; totalCap?: number };
  validUntil?: string;
};
