import { app } from 'electron';
import type { Alarm } from '@shared/types';
import { logger } from '../../core/logger';
import type { SettingsService } from '../settings/SettingsService';
import type { AlarmService } from './AlarmService';
import { runPowerShell, type ScriptRunner } from './powershell';
import { buildRegisterScript, buildUnregisterScript } from './sleepWakeScript';

/** The PC wakes this long before the alarm so the app has time to start. */
const LEAD_MS = 45_000;

export interface SleepWakeStatus {
  supported: boolean;
  scheduledFor: number | null;
  error: string | null;
}

export function nextWakeTarget(alarms: Alarm[], now: number): number | null {
  const times = alarms
    .filter((a) => a.enabled && a.nextFireAt !== null && a.nextFireAt > now)
    .map((a) => a.nextFireAt as number);
  return times.length > 0 ? Math.min(...times) : null;
}

/**
 * An app cannot ring while Windows is asleep. This keeps one Windows scheduled task pointed at the
 * next alarm, with "wake the computer to run this task" switched on. When it fires it starts Jarvis Desk
 * (or reaches the copy already running), which rings the alarm.
 */
export class SleepWakeService {
  private status: SleepWakeStatus = {
    supported: process.platform === 'win32',
    scheduledFor: null,
    error: null,
  };
  private chain: Promise<void> = Promise.resolve();
  private registered = false;

  constructor(
    private readonly alarms: AlarmService,
    private readonly settings: SettingsService,
    private readonly run: ScriptRunner = runPowerShell,
    private readonly clock: () => number = Date.now,
  ) {}

  start(): void {
    this.alarms.onChange(() => this.sync());
    this.settings.onChange((next, prev) => {
      if (next.general.wakeForAlarms !== prev.general.wakeForAlarms) this.sync();
    });
    this.sync();
  }

  getStatus(): SleepWakeStatus {
    return { ...this.status };
  }

  sync(): void {
    this.chain = this.chain
      .then(() => this.apply())
      .catch((error: unknown) => logger.warn('Wake timer sync failed', error));
  }

  private async apply(): Promise<void> {
    if (!this.status.supported) return;
    const wanted = this.settings.get().general.wakeForAlarms
      ? nextWakeTarget(this.alarms.list(), this.clock())
      : null;

    if (wanted === null) {
      if (this.registered) await this.run(buildUnregisterScript());
      this.registered = false;
      this.status = { ...this.status, scheduledFor: null, error: null };
      return;
    }

    const at = Math.max(this.clock() + 10_000, wanted - LEAD_MS);
    if (this.registered && this.status.scheduledFor === at) return;

    const exe = process.execPath;
    const args = app.isPackaged ? '--wake' : `"${app.getAppPath()}" --wake`;
    const result = await this.run(buildRegisterScript(exe, args, at));
    this.registered = result.ok;
    this.status = {
      ...this.status,
      scheduledFor: result.ok ? at : null,
      error: result.ok ? null : result.message || 'Could not schedule the wake timer.',
    };
    if (!result.ok) logger.warn(`Wake timer was not scheduled: ${result.message}`);
  }
}
