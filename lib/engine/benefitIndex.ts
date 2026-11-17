import { BRANDS, CATEGORY_LABELS, findBrand } from '@/lib/brands';
import { CARDS, type Benefit, type CardId, type Category } from '@/lib/cards';

/** One benefit of one card, with the category it belongs under and the brands it names. */
export type BenefitEntry = {
  cardId: CardId;
  benefit: Benefit;
  category: Category;
  brandNames: string[];
};

const brandName = (id: string) => BRANDS.find((b) => b.id === id)?.name ?? id;

/** The category a benefit is listed under: its own category, else the category of its brands, else 기타. */
export function benefitCategory(b: Benefit): Category {
  if (Array.isArray(b.categories) && b.categories.length > 0) return b.categories[0];
  const first = (b.brands ?? []).map((id) => BRANDS.find((x) => x.id === id)?.category).find(Boolean);
  return first ?? 'etc';
}

export function benefitEntries(cardIds: CardId[]): BenefitEntry[] {
  return cardIds.flatMap((cardId) =>
    CARDS[cardId].benefits.map((benefit) => ({
      cardId,
      benefit,
      category: benefitCategory(benefit),
      brandNames: (benefit.brands ?? []).map(brandName),
    })),
  );
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

/**
 * Benefits matching a search over every category: the category name ("카페"), a brand ("스타벅스"),
 * the benefit's own wording ("쇼핑 멤버십"), or any merchant text that resolves to a known brand.
 */
export function searchEntries(entries: BenefitEntry[], query: string): BenefitEntry[] {
  const q = norm(query);
  if (!q) return entries;
  const brand = findBrand(query);
  return entries.filter((e) => {
    if (norm(CATEGORY_LABELS[e.category]).includes(q)) return true;
    if (norm(e.benefit.label).includes(q)) return true;
    if (e.brandNames.some((n) => norm(n).includes(q) || q.includes(norm(n)))) return true;
    return brand !== null && (e.benefit.brands ?? []).includes(brand.id);
  });
}

/** Entries grouped by category, in the order the categories first appear. */
export function groupByCategory(entries: BenefitEntry[]): { category: Category; entries: BenefitEntry[] }[] {
  const out = new Map<Category, BenefitEntry[]>();
  for (const e of entries) out.set(e.category, [...(out.get(e.category) ?? []), e]);
  return [...out].map(([category, list]) => ({ category, entries: list }));
}
