import { Notification } from 'electron';
import { localDateKey, parseHHMM } from '@shared/time';
import type { DailyReport } from '@shared/types';
import type { KvRepository } from '../../db/repositories/KvRepository';
import type { Broadcaster } from '../../core/Broadcaster';
import { logger } from '../../core/logger';
import type { SettingsService } from '../settings/SettingsService';
import type { ReportService } from './ReportService';

const CHECK_MS = 30_000;
const KV_KEY = 'report.lastAutoDate';

/** Generates the end-of-day report once per day, at or after the configured time. */
export class DailyReportScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly reports: ReportService,
    private readonly settings: SettingsService,
    private readonly kv: KvRepository,
    private readonly broadcaster: Broadcaster,
    private readonly onNotificationClick: () => void,
    private readonly onGenerated: (report: DailyReport) => void,
    private readonly clock: () => number = Date.now,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.check(), CHECK_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async check(): Promise<void> {
    const { autoDaily, time } = this.settings.get().report;
    const target = parseHHMM(time);
    if (!autoDaily || !target || this.running) return;

    const now = new Date(this.clock());
    const reached = now.getHours() * 60 + now.getMinutes() >= target.hours * 60 + target.minutes;
    const today = localDateKey(now.getTime());
    if (!reached || this.kv.get(KV_KEY) === today) return;

    this.running = true;
    try {
      const report = await this.reports.generate();
      this.kv.set(KV_KEY, today);
      this.broadcaster.emit('report:ready', report);
      this.onGenerated(report);
      if (Notification.isSupported()) {
        const n = new Notification({
          title: 'Your day report is ready',
          body: 'Open Jarvis Desk to read it.',
        });
        n.on('click', this.onNotificationClick);
        n.show();
      }
    } catch (error) {
      logger.error('Automatic report failed', error);
    } finally {
      this.running = false;
    }
  }
}
