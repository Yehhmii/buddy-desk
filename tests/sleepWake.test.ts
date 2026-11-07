import { describe, expect, it } from 'vitest';
import type { Alarm } from '@shared/types';
import {
  buildRegisterScript,
  buildUnregisterScript,
  WAKE_TASK_NAME,
} from '@main/services/alarms/sleepWakeScript';
import { nextWakeTarget } from '@main/services/alarms/SleepWakeService';

const alarm = (id: number, nextFireAt: number | null, enabled = true): Alarm => ({
  id,
  label: 'a',
  kind: 'alarm',
  time: '07:00',
  repeatDays: [],
  enabled,
  nextFireAt,
  createdAt: 0,
});

describe('wake timer script', () => {
  it('asks Windows to wake the PC and escapes quotes in paths', () => {
    const script = buildRegisterScript(
      "C:\\Users\\O'Neil\\Jarvis Desk.exe",
      '--wake',
      new Date(2026, 10, 5, 6, 29, 15).getTime(),
    );
    expect(script).toContain('-WakeToRun');
    expect(script).toContain("'2026-11-05T06:29:15'");
    expect(script).toContain("C:\\Users\\O''Neil\\Jarvis Desk.exe");
    expect(script).toContain(`'${WAKE_TASK_NAME}'`);
  });

  it('can remove the timer again', () => {
    expect(buildUnregisterScript()).toContain('Unregister-ScheduledTask');
  });
});

describe('nextWakeTarget', () => {
  it('picks the earliest enabled alarm in the future', () => {
    expect(nextWakeTarget([alarm(1, 5000), alarm(2, 3000), alarm(3, 1000, false), alarm(4, 100)], 1000)).toBe(
      3000,
    );
  });

  it('returns null when nothing is upcoming', () => {
    expect(nextWakeTarget([alarm(1, 100)], 1000)).toBeNull();
    expect(nextWakeTarget([], 1000)).toBeNull();
  });
});
