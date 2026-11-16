'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CardId } from '@/lib/cards';
import { ownedCards } from '@/lib/cards/owned';
import { createClient } from '@/lib/supabase/client';
import { getMyCards } from './myCards';

const ALL: CardId[] = ['kb-talktalk', 'kb-nara', 'toss', 'kb-youth-b'];

/** Cards to show in pickers and the cards tab. Shows every card until the answer arrives or if it fails. */
export function useOwnedCards(): CardId[] {
  const db = useMemo(() => createClient(), []);
  const [ids, setIds] = useState<CardId[]>(ALL);
  useEffect(() => {
    getMyCards(db).then((rows) => setIds(ownedCards(rows))).catch(() => {});
  }, [db]);
  return ids;
}
