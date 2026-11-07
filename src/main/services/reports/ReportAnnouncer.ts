import { powerMonitor } from 'electron';
import type { DailyReport } from '@shared/types';
import type { Broadcaster } from '../../core/Broadcaster';
import type { SettingsService } from '../settings/SettingsService';

const CHECK_MS = 15_000;
/** Someone who touched the keyboard or mouse in the last 3 minutes is at the computer. */
const ACTIVE_WITHIN_S = 180;
/** Stop waiting for the person to come back after this long. */
const GIVE_UP_MS = 3 * 60 * 60_000;

/**
 * When the day report is ready, waits until you are actually at the computer, then tells the window to
 * bring Jarvis to life and ask whether to read it out. If the PC is locked or you have stepped away, it
 * keeps waiting and asks as soon as you are back.
 */
export class ReportAnnouncer {
  private pending: { report: DailyReport; since: number } | null = null;
  private timer: NodeJS.Timeout | null = null;
  private locked = false;

  constructor(
    private readonly broadcaster: Broadcaster,
    private readonly settings: SettingsService,
    private readonly clock: () => number = Date.now,
    private readonly idleSeconds: () => number = () => powerMonitor.getSystemIdleTime(),
  ) {}

  start(): void {
    powerMonitor.on('lock-screen', () => (this.locked = true));
    powerMonitor.on('unlock-screen', () => {
      this.locked = false;
      this.check();
    });
  }

  announce(report: DailyReport): void {
    if (!this.settings.get().report.askToRead) return;
    this.pending = { report, since: this.clock() };
    this.check();
    if (this.pending && !this.timer) this.timer = setInterval(() => this.check(), CHECK_MS);
  }

  /** Exposed for tests. */
  check(): void {
    const p = this.pending;
    if (!p) return this.stopTimer();
    if (this.clock() - p.since > GIVE_UP_MS) {
      this.pending = null;
      return this.stopTimer();
    }
    if (this.locked || this.idleSeconds() > ACTIVE_WITHIN_S) return;
    this.pending = null;
    this.stopTimer();
    this.broadcaster.emit('report:announce', p.report);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
