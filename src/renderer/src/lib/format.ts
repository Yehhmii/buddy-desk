import { formatClockTime } from '@shared/time';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function describeRepeat(days: number[]): string {
  if (days.length === 0) return 'Once';
  if (days.length === 7) return 'Every day';
  const set = new Set(days);
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'Weekdays';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';
  return [...set]
    .sort()
    .map((d) => DAY_NAMES[d])
    .join(', ');
}

export function describeDue(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const today = new Date(now);
  const sameDay = d.toDateString() === today.toDateString();
  const tomorrow = new Date(now + 86_400_000).toDateString() === d.toDateString();
  const hasTime = d.getHours() !== 23 || d.getMinutes() !== 59;
  const day = sameDay
    ? 'Today'
    : tomorrow
      ? 'Tomorrow'
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return hasTime ? `${day}, ${formatClockTime(ts)}` : day;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
