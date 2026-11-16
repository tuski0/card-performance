import { describe, expect, it } from 'vitest';
import { forecast } from './forecast';

describe('forecast', () => {
  it('projects linearly from the pace so far', () => {
    expect(forecast(100000, 200000, '2026-11-10')).toMatchObject({ projected: 300000, daysLeft: 20, alert: false });
  });
  it('alerts when the pace falls short', () => {
    expect(forecast(50000, 200000, '2026-11-15')).toMatchObject({ projected: 100000, shortfall: 150000, alert: true });
  });
  it('alerts in the last 7 days whenever the target is not met', () => {
    expect(forecast(190000, 200000, '2026-11-25')).toMatchObject({ daysLeft: 5, shortfall: 10000, alert: true });
  });
  it('no alert once reached or without a target', () => {
    expect(forecast(200000, 200000, '2026-11-28').alert).toBe(false);
    expect(forecast(1000, null, '2026-11-28').alert).toBe(false);
  });
  it('first days of the month do not alarm on a slow start', () => {
    expect(forecast(0, 200000, '2026-11-03').alert).toBe(false);
  });
});
