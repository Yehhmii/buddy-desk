import { app } from 'electron';

export const AUTOSTART_FLAG = '--autostart';

/** Only touches the Windows login entry for installed builds, never for `npm run dev`. */
export function applyLaunchAtLogin(enabled: boolean): void {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: enabled, args: [AUTOSTART_FLAG] });
}

export function launchedAtLogin(): boolean {
  // Windows passes our flag. macOS reports it through the login item settings instead.
  return (
    process.argv.includes(AUTOSTART_FLAG) ||
    (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAtLogin)
  );
}
