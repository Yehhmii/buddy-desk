import { describe, expect, it, vi } from 'vitest';
import { parseYesNo } from '@shared/yesNo';
import { reportToSpeech } from '@shared/reportSpeech';
import { frameAt, blinkScale, targetWave } from '@/features/voice/skinMotion';

vi.mock('electron', () => ({ powerMonitor: { on: vi.fn(), getSystemIdleTime: () => 0 } }));

describe('parseYesNo', () => {
  it('understands natural answers', () => {
    for (const t of ['Yes', 'yeah sure', 'go ahead', 'Yes please!', 'okay read it'])
      expect(parseYesNo(t)).toBe('yes');
    for (const t of ['No', 'nope', 'not now', 'no thanks', 'maybe later']) expect(parseYesNo(t)).toBe('no');
  });
  it('lets no win over yes, and returns null when unclear', () => {
    expect(parseYesNo('no thanks please')).toBe('no');
    expect(parseYesNo('what is the weather')).toBeNull();
    expect(parseYesNo('')).toBeNull();
  });
});

describe('reportToSpeech', () => {
  const md = [
    '# Day report, Wednesday',
    'You finished 2 tasks today.',
    '## Finished today (2)',
    '- Send invoice',
    '- Call landlord',
    '## Still open (0)',
    '_Nothing is waiting. Clean slate._',
  ].join('\n\n');
  it('reads sections as sentences without markdown noise', () => {
    const spoken = reportToSpeech(md);
    expect(spoken).toContain('You finished 2 tasks today.');
    expect(spoken).toContain('Finished today: Send invoice and Call landlord.');
    expect(spoken).toContain('Still open: nothing.');
    expect(spoken).not.toMatch(/[#*_]/);
  });
  it('shortens long lists', () => {
    const items = Array.from({ length: 9 }, (_, i) => `- Task ${i + 1}`).join('\n');
    expect(reportToSpeech(`## Open (9)\n${items}`)).toContain('and 3 more');
  });
});

describe('ReportAnnouncer', () => {
  async function build(idle: { s: number }, now: { t: number }) {
    const { ReportAnnouncer } = await import('@main/services/reports/ReportAnnouncer');
    const emitted: unknown[] = [];
    const settings = { get: () => ({ report: { askToRead: true } }) } as never;
    const announcer = new ReportAnnouncer(
      { emit: (_e: string, p: unknown) => void emitted.push(p) } as never,
      settings,
      () => now.t,
      () => idle.s,
    );
    return { announcer, emitted };
  }
  const report = { id: 1, date: '2026-11-05', markdown: '# x', createdAt: 0 };

  it('asks right away when the person is at the computer', async () => {
    const { announcer, emitted } = await build({ s: 5 }, { t: 0 });
    announcer.announce(report);
    expect(emitted).toHaveLength(1);
  });

  it('waits while they are away, then asks once they are back', async () => {
    const idle = { s: 3600 };
    const { announcer, emitted } = await build(idle, { t: 0 });
    announcer.announce(report);
    expect(emitted).toHaveLength(0);
    idle.s = 4;
    announcer.check();
    expect(emitted).toHaveLength(1);
    announcer.check();
    expect(emitted).toHaveLength(1); // only once
  });

  it('gives up after a few hours', async () => {
    const now = { t: 0 };
    const idle = { s: 9999 };
    const { announcer, emitted } = await build(idle, now);
    announcer.announce(report);
    now.t = 4 * 60 * 60_000;
    idle.s = 1;
    announcer.check();
    expect(emitted).toHaveLength(0);
  });
});

describe('vector skin motion', () => {
  it('blinks briefly and stays open otherwise', () => {
    expect(blinkScale(1.0)).toBe(1);
    expect(blinkScale(0.08)).toBeLessThan(0.2);
  });
  it('waves while listening or speaking and stands otherwise', () => {
    expect([
      targetWave('idle'),
      targetWave('thinking'),
      targetWave('listening'),
      targetWave('speaking'),
    ]).toEqual([0, 0, 1, 1]);
  });
  it('raises the arm toward the wave angle and opens the mouth while speaking', () => {
    const up = frameAt(1, 1, 'speaking', 0.8);
    const down = frameAt(1, 0, 'idle', 0);
    expect(up.armRAngle(-6, -148)).toBeLessThan(-100);
    expect(down.armRAngle(-6, -148)).toBe(-6);
    expect(up.mouth(0.3)).toBeGreaterThan(down.mouth(0.3));
  });
});
