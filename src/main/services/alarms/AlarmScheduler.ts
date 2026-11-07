import { Notification, powerMonitor, powerSaveBlocker } from 'electron';
import { formatClockTime } from '@shared/time';
import type { Alarm, RingingAlarm } from '@shared/types';
import type { Broadcaster } from '../../core/Broadcaster';
import { logger } from '../../core/logger';
import type { AlarmService } from './AlarmService';

const TICK_MS = 1000;
/** An alarm discovered this late (PC was off or asleep) is reported as missed instead of ringing. */
const MISSED_AFTER_MS = 15 * 60_000;
/** Keep the PC awake while an alarm rings, but never longer than this. */
const MAX_RING_AWAKE_MS = 10 * 60_000;

/**
 * Ticks once a second and fires anything due. A polling loop (instead of one long timer)
 * survives sleep, clock changes and daylight-saving jumps without special cases.
 */
export class AlarmScheduler {
  private timer: NodeJS.Timeout | null = null;
  private readonly ringing = new Map<number, RingingAlarm>();
  private blockerId: number | null = null;
  private blockerTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly alarms: AlarmService,
    private readonly broadcaster: Broadcaster,
    private readonly onNotificationClick: () => void,
    private readonly onRing: () => void,
    private readonly clock: () => number = Date.now,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    powerMonitor.on('resume', () => this.tick());
    this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.releaseAwake();
  }

  getRinging(): RingingAlarm[] {
    return [...this.ringing.values()];
  }

  dismiss(id: number): void {
    if (this.ringing.delete(id)) this.broadcaster.emit('alarms:stop', { id });
    if (this.ringing.size === 0) this.releaseAwake();
  }

  snooze(id: number, minutes: number): void {
    this.alarms.snooze(id, minutes);
    this.dismiss(id);
  }

  private tick(): void {
    const now = this.clock();
    for (const alarm of this.alarms.list()) {
      if (!alarm.enabled || alarm.nextFireAt === null || alarm.nextFireAt > now) continue;
      if (this.ringing.has(alarm.id)) continue;
      this.fire(alarm, now);
    }
  }

  private fire(alarm: Alarm, now: number): void {
    if (alarm.nextFireAt !== null && now - alarm.nextFireAt > MISSED_AFTER_MS) {
      logger.info(`Alarm ${alarm.id} was missed`);
      this.alarms.markFired(alarm.id);
      this.notifyMissed(alarm);
      return;
    }
    logger.info(`Alarm ${alarm.id} ringing`);
    this.keepAwake();
    const ringing: RingingAlarm = { alarm, ringingSince: now };
    this.ringing.set(alarm.id, ringing);
    this.alarms.markFired(alarm.id);
    this.broadcaster.emit('alarms:ring', ringing);
    this.onRing();
    this.notify(alarm);
  }

  private keepAwake(): void {
    if (this.blockerId === null) this.blockerId = powerSaveBlocker.start('prevent-display-sleep');
    if (this.blockerTimer) clearTimeout(this.blockerTimer);
    this.blockerTimer = setTimeout(() => this.releaseAwake(), MAX_RING_AWAKE_MS);
  }

  private releaseAwake(): void {
    if (this.blockerTimer) clearTimeout(this.blockerTimer);
    this.blockerTimer = null;
    if (this.blockerId !== null && powerSaveBlocker.isStarted(this.blockerId))
      powerSaveBlocker.stop(this.blockerId);
    this.blockerId = null;
  }

  private notifyMissed(alarm: Alarm): void {
    if (!Notification.isSupported() || alarm.nextFireAt === null) return;
    const n = new Notification({
      title: 'Missed alarm',
      body: `${alarm.label}, was due at ${formatClockTime(alarm.nextFireAt)}`,
    });
    n.on('click', this.onNotificationClick);
    n.show();
  }

  private notify(alarm: Alarm): void {
    if (!Notification.isSupported()) return;
    const n = new Notification({
      title: alarm.kind === 'timer' ? 'Timer finished' : 'Alarm',
      body: alarm.label,
      silent: true,
    });
    n.on('click', this.onNotificationClick);
    n.show();
  }
}
