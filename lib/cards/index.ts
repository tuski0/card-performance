import { kbNara } from './kb-nara';
import { kbTalkTalk } from './kb-talktalk';
import { kbYouthB } from './kb-youth-b';
import { toss } from './toss';
import type { CardId, CardRule } from './types';

export * from './types';

export const CARDS: Record<CardId, CardRule> = {
  'kb-talktalk': kbTalkTalk,
  'kb-nara': kbNara,
  toss,
  'kb-youth-b': kbYouthB,
};
