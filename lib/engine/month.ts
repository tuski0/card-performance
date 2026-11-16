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

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

/** 'YYYY-MM-DD' of an ISO timestamp in Korea time. */
export function dayKey(iso: string): string {
  return dayFmt.format(new Date(iso));
}

/** Weekday (0=Sun) of the 1st and number of days in the month. */
export function monthShape(month: string): { firstWeekday: number; days: number } {
  const [y, m] = month.split('-').map(Number);
  return { firstWeekday: new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}

/** YYYY-MM-DD plus n days (calendar arithmetic, no timezone involved). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The Sunday-start week (7 days) that contains `day`. */
export function weekOf(day: string): string[] {
  const [y, m, d] = day.split('-').map(Number);
  const sunday = addDays(day, -new Date(Date.UTC(y, m - 1, d)).getUTCDay());
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}
