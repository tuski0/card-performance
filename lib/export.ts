import { BRANDS, CATEGORY_LABELS } from '@/lib/brands';
import { CARDS, type Payment } from '@/lib/cards';
import { byCard, byCategory } from '@/lib/engine/history';
import { dayKey } from '@/lib/engine/month';

export const PAYMENT_HEADER = ['날짜', '시각', '카드', '가맹점', '브랜드', '분류', '금액', '받은 혜택', '상태'];
export const SUMMARY_HEADER = ['구분', '이름', '지출', '받은 혜택', '건수'];

const kstTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

/** One row per payment, newest first. */
export function paymentRows(payments: Payment[], benefit: Map<string, number>): (string | number)[][] {
  return [...payments]
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    .map((p) => [
      dayKey(p.paidAt), kstTime(p.paidAt), CARDS[p.cardId]?.name ?? p.cardId, p.merchant,
      BRANDS.find((b) => b.id === p.brand)?.name ?? '', CATEGORY_LABELS[p.category],
      p.amount, benefit.get(p.id) ?? 0, p.canceled ? '취소' : '',
    ]);
}

/** Totals by category and by card (canceled payments excluded). */
export function summaryRows(payments: Payment[], benefit: Map<string, number>): (string | number)[][] {
  return [
    ...byCategory(payments, benefit).map((c) => ['분류', CATEGORY_LABELS[c.category], c.spent, c.benefit, c.count]),
    ...byCard(payments, benefit).map((c) => ['카드', CARDS[c.cardId].name, c.spent, c.benefit, c.count]),
  ];
}

/** Builds the .xlsx in the browser and starts the download. Nothing is sent to a server. */
export async function downloadXlsx(payments: Payment[], benefit: Map<string, number>, fileName: string): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const head = (cells: string[]) => cells.map((value) => ({ value, fontWeight: 'bold' as const }));
  const body = (rows: (string | number)[][]) => rows.map((r) => r.map((value) => ({ value })));
  await writeXlsxFile([
    {
      data: [head(PAYMENT_HEADER), ...body(paymentRows(payments, benefit))],
      sheet: '결제 내역',
      columns: [{ width: 12 }, { width: 7 }, { width: 26 }, { width: 24 }, { width: 12 }, { width: 14 }, { width: 11 }, { width: 10 }, { width: 6 }],
      stickyRowsCount: 1,
    },
    {
      data: [head(SUMMARY_HEADER), ...body(summaryRows(payments, benefit))],
      sheet: '요약',
      columns: [{ width: 6 }, { width: 26 }, { width: 12 }, { width: 10 }, { width: 6 }],
      stickyRowsCount: 1,
    },
  ]).toFile(fileName);
}
