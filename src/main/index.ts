import { app, protocol } from 'electron';
import { logger } from './core/logger';
import { WindowBroadcaster } from './core/Broadcaster';
import { loadEnv } from './config/env';
import { paths } from './config/paths';
import { openDatabase } from './db/database';
import { MODEL_SCHEME, SHOTS_SCHEME, hardenApp } from './app/security';
import { registerModelProtocol, registerShotsProtocol } from './app/protocols';
import { WindowManager } from './app/WindowManager';
import { OverlayWindow } from './app/OverlayWindow';
import { TrayService } from './app/TrayService';
import { ShortcutService } from './app/ShortcutService';
import { applyLaunchAtLogin, launchedAtLogin } from './app/loginItem';
import { installMenu } from './app/menu';
import { createContainer } from './container';
import { registerIpc } from './ipc/registerIpc';

// Must run before the app is ready.
protocol.registerSchemesAsPrivileged([MODEL_SCHEME, SHOTS_SCHEME]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  void boot();
}

async function boot(): Promise<void> {
  await app.whenReady();
  app.setAppUserModelId('com.buddydesk.app');
  loadEnv();
  hardenApp();
  installMenu();

  const broadcaster = new WindowBroadcaster();
  const windows = new WindowManager(true, () => app.quit());
  const overlay = new OverlayWindow(() => windows.isActive());
  const db = openDatabase(paths.database());
  const c = createContainer(db, broadcaster, {
    showWindow: () => windows.show(),
    navigate: (view) => broadcaster.emit('app:navigate', view),
    concealWindows: () => windows.concealForCapture(),
  });

  // The talk shortcut and tray entry start voice without opening the main window.
  const shortcuts = new ShortcutService(() => broadcaster.emit('voice:toggle', undefined));
  const tray = new TrayService();

  const apply = (): void => {
    const s = c.settings.get();
    windows.applySettings(s);
    overlay.applySettings(s);
    shortcuts.register(s.voice.hotkey);
    applyLaunchAtLogin(s.general.launchAtLogin);
  };

  apply();
  c.settings.onChange(apply);
  registerModelProtocol(c.wakeModel);
  registerShotsProtocol();
  registerIpc({ c, windows, shortcuts, overlay, broadcaster });

  await c.secrets.init();
  const quietStart = c.settings.get().general.startHidden && launchedAtLogin();
  windows.create(!quietStart);
  overlay.create();
  tray.create({
    show: () => windows.show(),
    openSettings: () => {
      windows.show();
      broadcaster.emit('app:navigate', 'settings');
    },
    toggleVoice: () => broadcaster.emit('voice:toggle', undefined),
    quit: () => app.quit(),
  });

  c.alarmScheduler.start();
  c.sleepWake.start();
  c.reportScheduler.start();
  c.announcer.start();
  c.updates.start();

  app.on('second-instance', () => windows.show());
  app.on('activate', () => windows.show());
  app.on('before-quit', () => windows.markQuitting());
  app.on('window-all-closed', () => {
    /* stay alive in the tray */
  });
  app.on('will-quit', () => {
    shortcuts.unregister();
    c.alarmScheduler.stop();
    c.reportScheduler.stop();
    c.updates.stop();
    tray.destroy();
    overlay.dispose();
    void c.ocr.dispose();
    db.close();
  });

  logger.info(`Jarvis Desk ${app.getVersion()} started`);
}
