export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** Compact amount for calendar cells: 9,500 / 1.2만 / 48만. */
export function short(n: number): string {
  if (n < 10000) return n.toLocaleString('ko-KR');
  const man = n / 10000;
  return `${man >= 10 ? Math.round(man) : Math.round(man * 10) / 10}만`;
}
