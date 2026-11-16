import { monthShape } from './month';

export type Forecast = { projected: number; daysLeft: number; shortfall: number; alert: boolean };

/**
 * Month-end performance if spending keeps the same daily pace.
 * Alerts when the pace misses the target (from day 7 on), or in the last 7 days while still short.
 */
export function forecast(performance: number, target: number | null, today: string): Forecast {
  const { days } = monthShape(today.slice(0, 7));
  const day = Number(today.slice(8, 10));
  const projected = Math.round((performance / day) * days);
  const daysLeft = days - day;
  const remaining = target === null ? 0 : Math.max(0, target - performance);
  const short = target === null ? 0 : Math.max(0, target - projected);
  const alert = target !== null && remaining > 0 && ((day >= 7 && short > 0) || daysLeft <= 7);
  return { projected, daysLeft, shortfall: remaining, alert };
}
