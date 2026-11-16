export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** Compact amount for calendar cells: 5,980 / 99,999 / 12.3만 / 125만. */
export function short(n: number): string {
  if (n < 100000) return n.toLocaleString('ko-KR');
  const man = n / 10000;
  return `${man >= 100 ? Math.round(man) : Math.round(man * 10) / 10}만`;
}

/** Message from an Error or a Supabase error object. */
export function errMsg(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return fallback;
}
