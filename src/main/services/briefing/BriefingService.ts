import { formatClockTime, greetingForHour } from '@shared/time';
import { compareTasks } from '@shared/sort';
import type { Alarm, Briefing, Task } from '@shared/types';
import type { AlarmService } from '../alarms/AlarmService';
import type { SettingsService } from '../settings/SettingsService';
import type { TaskService } from '../tasks/TaskService';

const HIGHLIGHTS = 3;

export function nextAlarmOf(alarms: Alarm[], now: number): Alarm | null {
  return (
    alarms
      .filter((a) => a.enabled && a.nextFireAt !== null && a.nextFireAt > now)
      .sort((a, b) => (a.nextFireAt ?? 0) - (b.nextFireAt ?? 0))[0] ?? null
  );
}

export function composeBriefing(opts: {
  name: string;
  now: number;
  pending: Task[];
  nextAlarm: Alarm | null;
}): Briefing {
  const hello = greetingForHour(new Date(opts.now).getHours());
  const greeting = opts.name ? `${hello}, ${opts.name}` : hello;
  const highlights = [...opts.pending].sort(compareTasks).slice(0, HIGHLIGHTS);
  const count = opts.pending.length;

  const parts: string[] = [`${greeting}.`];
  if (count === 0) {
    parts.push('You have nothing pending.');
  } else {
    parts.push(`You have ${count} ${count === 1 ? 'task' : 'tasks'} pending.`);
    parts.push(`First up: ${highlights.map((t) => t.title).join(', ')}.`);
  }
  if (opts.nextAlarm?.nextFireAt) {
    parts.push(`Your next alarm is at ${formatClockTime(opts.nextAlarm.nextFireAt)}.`);
  }

  return {
    greeting,
    spokenText: parts.join(' '),
    pendingCount: count,
    highlights,
    nextAlarm: opts.nextAlarm,
  };
}

export class BriefingService {
  constructor(
    private readonly tasks: TaskService,
    private readonly alarms: AlarmService,
    private readonly settings: SettingsService,
    private readonly clock: () => number = Date.now,
  ) {}

  compose(): Briefing {
    const now = this.clock();
    return composeBriefing({
      name: this.settings.get().general.userName,
      now,
      pending: this.tasks.list('pending'),
      nextAlarm: nextAlarmOf(this.alarms.list(), now),
    });
  }
}
