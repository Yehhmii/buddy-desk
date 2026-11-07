import { Menu, Tray, nativeImage } from 'electron';
import { paths } from '../config/paths';

export interface TrayActions {
  show: () => void;
  openSettings: () => void;
  toggleVoice: () => void;
  quit: () => void;
}

export class TrayService {
  private tray: Tray | null = null;

  create(actions: TrayActions): void {
    const icon = nativeImage.createFromPath(paths.trayIcon());
    if (process.platform === 'darwin') icon.setTemplateImage(true);
    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    this.tray.setToolTip('Jarvis Desk');
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Open Jarvis Desk', click: actions.show },
        { label: 'Talk to Jarvis', click: actions.toggleVoice },
        { label: 'Settings and API keys…', click: actions.openSettings },
        { type: 'separator' },
        { label: 'Quit', click: actions.quit },
      ]),
    );
    this.tray.on('click', actions.show);
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
