import { describe, expect, it } from 'vitest';
import { computeNextFire } from '@main/services/alarms/nextFire';

const at = (y: number, m: number, d: number, h: number, min: number): number =>
  new Date(y, m - 1, d, h, min, 0, 0).getTime();

describe('computeNextFire', () => {
  it('picks later today when the time has not passed', () => {
    expect(computeNextFire(at(2026, 11, 4, 6, 0), '07:30', [])).toBe(at(2026, 11, 4, 7, 30));
  });

  it('rolls to tomorrow when the time has passed', () => {
    expect(computeNextFire(at(2026, 11, 4, 8, 0), '07:30', [])).toBe(at(2026, 11, 5, 7, 30));
  });

  it('never returns the current minute', () => {
    expect(computeNextFire(at(2026, 11, 4, 7, 30), '07:30', [])).toBe(at(2026, 11, 5, 7, 30));
  });

  it('respects repeat days', () => {
    // 4 Nov 2026 is a Wednesday (3). Next Monday (1) is 9 Nov.
    expect(computeNextFire(at(2026, 11, 4, 8, 0), '07:30', [1])).toBe(at(2026, 11, 9, 7, 30));
  });

  it('rejects invalid times', () => {
    expect(() => computeNextFire(Date.now(), '25:00', [])).toThrow();
  });
});
