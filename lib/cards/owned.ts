import { CARDS } from './index';
import type { CardId, CardRule } from './types';

/** Cards the user turned on; everyone sees all cards until they pick some. */
export function ownedCards(rows: { cardId: CardId; owned: boolean }[]): CardId[] {
  const picked = rows.filter((r) => r.owned).map((r) => r.cardId);
  return picked.length > 0 ? picked : (Object.keys(CARDS) as CardId[]);
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export function searchCards(query: string): CardRule[] {
  const q = norm(query);
  const all = Object.values(CARDS);
  return q ? all.filter((c) => norm(c.name).includes(q)) : all;
}
