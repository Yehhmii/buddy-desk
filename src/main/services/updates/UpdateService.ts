import { Notification, app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { logger } from '../../core/logger';
import type { SettingsService } from '../settings/SettingsService';

const FIRST_CHECK_MS = 45_000;
const EVERY_MS = 6 * 60 * 60_000;

/**
 * Keeps installed copies current from GitHub Releases. It does nothing in development builds, and it
 * fails quietly: an update problem must never get in the way of the assistant itself.
 * (On macOS, updates only install if the app is signed and notarized.)
 */
export class UpdateService {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly settings: SettingsService) {}

  start(): void {
    if (!app.isPackaged) return;
    autoUpdater.logger = logger;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('error', (error) => logger.warn('Update check failed', error));
    autoUpdater.on('update-downloaded', (info) => {
      if (Notification.isSupported()) {
        new Notification({
          title: 'Jarvis Desk update ready',
          body: `Version ${info.version} will be installed when you quit.`,
        }).show();
      }
    });
    setTimeout(() => this.check(), FIRST_CHECK_MS);
    this.timer = setInterval(() => this.check(), EVERY_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private check(): void {
    if (!this.settings.get().general.autoUpdate) return;
    autoUpdater.checkForUpdates().catch((error: unknown) => logger.warn('Update check failed', error));
  }
}
