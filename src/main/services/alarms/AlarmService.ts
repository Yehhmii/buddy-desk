import type { Alarm, AlarmInput } from '@shared/types';
import { MINUTE_MS, formatHHMM } from '@shared/time';
import { NotFoundError } from '../../core/errors';
import type { Broadcaster } from '../../core/Broadcaster';
import type { AlarmRepository } from '../../db/repositories/AlarmRepository';
import { computeNextFire } from './nextFire';

export class AlarmService {
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly repo: AlarmRepository,
    private readonly broadcaster: Broadcaster,
    private readonly clock: () => number = Date.now,
  ) {}

  /** Called after any alarm is created, changed, fired or removed. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  list(): Alarm[] {
    return this.repo.list();
  }

  get(id: number): Alarm | null {
    return this.repo.get(id);
  }

  create(input: AlarmInput): Alarm {
    const now = this.clock();
    const repeatDays = [...new Set(input.repeatDays ?? [])].sort();
    let alarm: Alarm;
    if (input.inMinutes !== undefined) {
      const minutes = input.inMinutes;
      alarm = this.repo.insert(
        {
          label: input.label?.trim() || `${minutes} min timer`,
          kind: 'timer',
          time: null,
          repeatDays: [],
          nextFireAt: now + minutes * MINUTE_MS,
        },
        now,
      );
    } else if (input.time) {
      alarm = this.repo.insert(
        {
          label: input.label?.trim() || formatHHMM(input.time),
          kind: 'alarm',
          time: input.time,
          repeatDays,
          nextFireAt: computeNextFire(now, input.time, repeatDays),
        },
        now,
      );
    } else {
      throw new Error('Alarm needs a time or a duration');
    }
    this.changed();
    return alarm;
  }

  toggle(id: number, enabled: boolean): Alarm {
    const alarm = this.require(id);
    const next = enabled ? this.nextFor(alarm, this.clock()) : null;
    const updated = this.repo.setSchedule(id, enabled && next !== null, next);
    this.changed();
    return updated;
  }

  remove(id: number): Alarm {
    const alarm = this.require(id);
    this.repo.delete(id);
    this.changed();
    return alarm;
  }

  /** Called by the scheduler after an alarm rings. One-offs switch off, repeating ones roll forward. */
  markFired(id: number): Alarm | null {
    const alarm = this.repo.get(id);
    if (!alarm) return null;
    const repeating = alarm.kind === 'alarm' && alarm.time !== null && alarm.repeatDays.length > 0;
    const updated =
      repeating && alarm.time
        ? this.repo.setSchedule(id, true, computeNextFire(this.clock(), alarm.time, alarm.repeatDays))
        : this.repo.setSchedule(id, false, null);
    this.changed();
    return updated;
  }

  snooze(id: number, minutes: number): Alarm {
    const alarm = this.require(id);
    const updated = this.repo.setSchedule(id, true, this.clock() + minutes * MINUTE_MS);
    this.changed();
    void alarm;
    return updated;
  }

  /** Resolves "the 7am alarm" style references from the assistant. */
  find(ref: string | number): Alarm[] {
    const text = String(ref).trim().toLowerCase();
    const all = this.repo.list();
    const idMatch = /^#?(\d+)$/.exec(text);
    if (idMatch) return all.filter((a) => a.id === Number(idMatch[1]));
    return all.filter(
      (a) =>
        a.label.toLowerCase().includes(text) ||
        (a.time !== null && formatHHMM(a.time).toLowerCase() === text),
    );
  }

  private nextFor(alarm: Alarm, now: number): number | null {
    if (alarm.kind === 'alarm' && alarm.time) return computeNextFire(now, alarm.time, alarm.repeatDays);
    return null;
  }

  private require(id: number): Alarm {
    const alarm = this.repo.get(id);
    if (!alarm) throw new NotFoundError('That alarm');
    return alarm;
  }

  private changed(): void {
    this.broadcaster.emit('alarms:changed', this.repo.list());
    for (const listener of this.listeners) listener();
  }
}
