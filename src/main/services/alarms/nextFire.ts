import { parseHHMM } from '@shared/time';

/**
 * Next time a clock alarm should fire, strictly after `now`.
 * `repeatDays` uses 0 = Sunday ... 6 = Saturday. Empty means "the next time it is HH:MM".
 */
export function computeNextFire(now: number, time: string, repeatDays: number[]): number {
  const parsed = parseHHMM(time);
  if (!parsed) throw new Error(`Invalid time: ${time}`);
  const allowed = repeatDays.length > 0 ? new Set(repeatDays) : null;

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(parsed.hours, parsed.minutes, 0, 0);
    if (candidate.getTime() <= now) continue;
    if (allowed && !allowed.has(candidate.getDay())) continue;
    return candidate.getTime();
  }
  throw new Error('Could not compute next alarm time');
}
