import type { Alarm, AlarmKind } from '@shared/types';
import type { Db } from '../database';

interface AlarmRow {
  id: number;
  label: string;
  kind: AlarmKind;
  time: string | null;
  repeat_days: string;
  enabled: number;
  next_fire_at: number | null;
  created_at: number;
}

function parseDays(raw: string): number[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((d): d is number => Number.isInteger(d)) : [];
  } catch {
    return [];
  }
}

const toAlarm = (r: AlarmRow): Alarm => ({
  id: r.id,
  label: r.label,
  kind: r.kind,
  time: r.time,
  repeatDays: parseDays(r.repeat_days),
  enabled: r.enabled === 1,
  nextFireAt: r.next_fire_at,
  createdAt: r.created_at,
});

export type NewAlarm = Pick<Alarm, 'label' | 'kind' | 'time' | 'repeatDays' | 'nextFireAt'>;

export class AlarmRepository {
  constructor(private readonly db: Db) {}

  insert(a: NewAlarm, now: number): Alarm {
    const info = this.db
      .prepare(
        'INSERT INTO alarms (label, kind, time, repeat_days, enabled, next_fire_at, created_at) VALUES (?,?,?,?,1,?,?)',
      )
      .run(a.label, a.kind, a.time, JSON.stringify(a.repeatDays), a.nextFireAt, now);
    return this.mustGet(Number(info.lastInsertRowid));
  }

  get(id: number): Alarm | null {
    const row = this.db.prepare('SELECT * FROM alarms WHERE id = ?').get(id) as AlarmRow | undefined;
    return row ? toAlarm(row) : null;
  }

  private mustGet(id: number): Alarm {
    const alarm = this.get(id);
    if (!alarm) throw new Error(`Alarm ${id} vanished after write`);
    return alarm;
  }

  list(): Alarm[] {
    const rows = this.db
      .prepare('SELECT * FROM alarms ORDER BY enabled DESC, next_fire_at ASC, id ASC')
      .all() as AlarmRow[];
    return rows.map(toAlarm);
  }

  setSchedule(id: number, enabled: boolean, nextFireAt: number | null): Alarm {
    this.db
      .prepare('UPDATE alarms SET enabled = ?, next_fire_at = ? WHERE id = ?')
      .run(enabled ? 1 : 0, nextFireAt, id);
    return this.mustGet(id);
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM alarms WHERE id = ?').run(id);
  }
}
