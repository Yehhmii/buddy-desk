import { join } from 'node:path';
import { app } from 'electron';

export const paths = {
  database: () => join(app.getPath('userData'), 'buddy.db'),
  models: () => join(app.getPath('userData'), 'models'),
  ocrCache: () => join(app.getPath('userData'), 'ocr'),
  screenshots: () => join(app.getPath('userData'), 'screenshots'),
  reports: () => join(app.getPath('documents'), 'Jarvis Reports'),
  trayIcon: () => {
    // macOS wants a monochrome "template" image that it tints for light and dark menu bars.
    const file = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png';
    return app.isPackaged ? join(process.resourcesPath, file) : join(app.getAppPath(), 'resources', file);
  },
  appIcon: () => join(app.getAppPath(), 'resources', 'icon.png'),
};
