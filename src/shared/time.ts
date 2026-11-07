export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** YYYY-MM-DD in the local time zone. */
export function localDateKey(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseHHMM(value: string): { hours: number; minutes: number } | null {
  const m = HHMM_PATTERN.exec(value);
  if (!m) return null;
  return { hours: Number(m[1]), minutes: Number(m[2]) };
}

export function formatClockTime(ts: number, hour12 = true): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12 });
}

export function formatHHMM(value: string): string {
  const parsed = parseHHMM(value);
  if (!parsed) return value;
  const d = new Date();
  d.setHours(parsed.hours, parsed.minutes, 0, 0);
  return formatClockTime(d.getTime());
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
