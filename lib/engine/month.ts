const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' });

/** 'YYYY-MM' of an ISO timestamp in Korea time. */
export function monthKey(iso: string): string {
  const parts = fmt.formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  return `${y}-${m}`;
}

export function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** ISO instant of 00:00 KST on the 1st of the month. */
export function monthStartIso(month: string): string {
  return new Date(`${month}-01T00:00:00+09:00`).toISOString();
}
