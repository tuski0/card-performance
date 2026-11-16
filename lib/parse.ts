import type { CardId } from '@/lib/cards';

export type ParsedPayment = { amount?: number; merchant?: string; cardId?: CardId; paidAt?: string };

const CARD_KEYWORDS: [RegExp, CardId][] = [
  [/청춘대로|톡톡/, 'kb-talktalk'],
  [/나라사랑/, 'kb-nara'],
  [/youth\s*club|유스클럽/i, 'kb-youth-b'],
  [/토스/, 'toss'],
];

const NOISE = /\[?web발신\]?|\[[^\]]*\]|[가-힣]\*[가-힣]+님|승인|사용|결제|일시불|체크카드|체크|신용|누적|토스뱅크|KB국민|KB|국민/gi;

/** Best-effort read of a card payment notification or SMS. Unknown parts are left out. */
export function parsePaymentText(text: string, now = new Date()): ParsedPayment {
  const out: ParsedPayment = {};
  const body = text.split(/잔액|누적/)[0];

  const amt = body.match(/([\d]{1,3}(?:,\d{3})+|\d+)\s*원/);
  if (!amt) return out;
  out.amount = Number(amt[1].replace(/,/g, ''));

  out.cardId = CARD_KEYWORDS.find(([re]) => re.test(text))?.[1];

  const dt = text.match(/(\d{1,2})[/.-](\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (dt) {
    const [, mo, d, h, mi] = dt.map(Number);
    const kstNow = new Date(now.getTime() + 9 * 3600000);
    let year = kstNow.getUTCFullYear();
    if (mo > kstNow.getUTCMonth() + 2) year -= 1;
    const pad = (n: number) => String(n).padStart(2, '0');
    out.paidAt = new Date(`${year}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:00+09:00`).toISOString();
  } else {
    out.paidAt = now.toISOString();
  }

  const bar = text.match(/\|\s*([^\n|]+)/);
  let merchant = bar?.[1];
  if (!merchant) {
    merchant = body
      .replace(amt[0], ' ')
      .replace(dt?.[0] ?? '', ' ')
      .replace(NOISE, ' ')
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^[\d\s/:.,-]+$/.test(l))
      .pop();
  }
  merchant = merchant?.replace(/youth\s*club|청춘대로톡톡|청춘대로|톡톡|나라사랑/gi, '').replace(/\s+/g, ' ').trim();
  if (merchant) out.merchant = merchant;
  return out;
}

/** Query string for /new from free text (always marks the source so the form can say it was prefilled). */
export function toFormQuery(text: string, now = new Date()): string {
  const p = parsePaymentText(text, now);
  const q = new URLSearchParams({ from: 'share' });
  if (p.amount) q.set('amount', String(p.amount));
  if (p.merchant) q.set('merchant', p.merchant);
  if (p.cardId) q.set('card', p.cardId);
  if (p.paidAt) q.set('at', p.paidAt);
  return q.toString();
}
