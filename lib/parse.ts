import type { CardId, Payment } from '@/lib/cards';
import { merchantKey } from '@/lib/merchants';

export type ParsedPayment = { amount?: number; merchant?: string; cardId?: CardId; paidAt?: string; last4?: string; canceled?: true };

const CARD_KEYWORDS: [RegExp, CardId][] = [
  [/청춘대로|톡톡/, 'kb-talktalk'],
  [/나라사랑/, 'kb-nara'],
  [/youth\s*club|유스클럽/i, 'kb-youth-b'],
  [/토스/, 'toss'],
];

const NOISE = /승인취소|취소|\[?web발신\]?|\[[^\]]*\]|[가-힣]\*[가-힣]+님|승인|사용|결제|일시불|체크카드|체크|신용|누적|토스뱅크|KB국민|KB|국민/gi;

/** Best-effort read of a card payment notification or SMS. Unknown parts are left out. */
export function parsePaymentText(text: string, now = new Date()): ParsedPayment {
  const out: ParsedPayment = {};
  // Drop app header lines such as "카드 사용 알림 26.11.16 | 08:34:40".
  text = text.split('\n').filter((l) => !/^\s*카드\s*사용\s*알림/.test(l) && !/\d{2}\.\d{2}\.\d{2}\s*\|/.test(l)).join('\n');
  const body = text.split(/잔액|누적/)[0];

  const amt = body.match(/([\d]{1,3}(?:,\d{3})+|\d+)\s*원/);
  if (!amt) return out;
  out.amount = Number(amt[1].replace(/,/g, ''));
  if (/취소/.test(text)) out.canceled = true;

  const cardId = CARD_KEYWORDS.find(([re]) => re.test(text))?.[1];
  if (cardId) out.cardId = cardId;
  const num = text.match(/\((\d{4})\)|카드\s*(\d{4})|(\d{4})\s*승인/);
  if (num) out.last4 = num[1] ?? num[2] ?? num[3];

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
      .filter((l) => l && !/^[\d\s/:.,()-]+$/.test(l) && !/^카드\s*\d{4}$/.test(l))
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
  if (p.last4) q.set('last4', p.last4);
  if (p.canceled) q.set('cancel', '1');
  return q.toString();
}

/** The payment a cancel notice refers to: same amount and merchant, not yet canceled, within 30 days before it. Latest wins. */
export function findCancelTarget(
  payments: Payment[],
  notice: { amount: number; merchant: string; paidAt: string },
): Payment | null {
  const key = merchantKey(notice.merchant);
  const end = Date.parse(notice.paidAt) + 60_000;
  const start = end - 30 * 86_400_000;
  const hits = payments.filter((p) => {
    const t = Date.parse(p.paidAt);
    return !p.canceled && p.amount === notice.amount && merchantKey(p.merchant) === key && t >= start && t <= end;
  });
  return hits.sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0] ?? null;
}
