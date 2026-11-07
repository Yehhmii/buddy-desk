import { join } from 'node:path';
import { BrowserWindow, screen } from 'electron';
import type { AppSettings } from '@shared/settings';
import { sanitizeSnapshot } from '@shared/snapshot';
import type { VoiceSnapshot } from '@shared/types';
import { logger } from '../core/logger';

const WIDTH = 460;
const HEIGHT = 380;
const BOTTOM_MARGIN = 14;
const FADE_MS = 260;

/**
 * The small Siri-style orb. It is a separate transparent, click-through window that never takes
 * focus, so it can appear over whatever you are doing without interrupting it. It only mirrors
 * the voice engine that lives in the main window; it has no logic of its own.
 */
export class OverlayWindow {
  private win: BrowserWindow | null = null;
  private hideTimer: NodeJS.Timeout | null = null;
  private visible = false;
  private ready = false;
  private protect = true;
  private enabled = true;
  private showText = true;

  constructor(
    /** True while the main window is on screen and focused. The overlay stays out of the way then. */
    private readonly isMainWindowActive: () => boolean,
  ) {}

  create(): void {
    const win = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      alwaysOnTop: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
        backgroundThrottling: false,
      },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setIgnoreMouseEvents(true);
    win.setContentProtection(this.protect);
    win.webContents.once('did-finish-load', () => (this.ready = true));
    win.webContents.on('render-process-gone', (_e, details) =>
      logger.error(`Overlay renderer gone: ${details.reason}`),
    );

    const devUrl = process.env['ELECTRON_RENDERER_URL'];
    if (devUrl) void win.loadURL(`${devUrl}/overlay.html`);
    else void win.loadFile(join(__dirname, '../renderer/overlay.html'));
    this.win = win;
  }

  applySettings(settings: AppSettings): void {
    this.enabled = settings.voice.showOverlay;
    this.showText = settings.voice.overlayShowText;
    this.protect = settings.privacy.hideFromCapture;
    this.win?.setContentProtection(this.protect);
    this.win?.setBackgroundColor('#00000000');
    if (!this.enabled) this.hideNow();
  }

  onSnapshot(s: VoiceSnapshot): void {
    if (!this.enabled || !this.win || this.win.isDestroyed() || !this.ready) return;
    // The overlay only ever receives what it is allowed to show.
    this.win.webContents.send('voice:snapshot', sanitizeSnapshot(s, this.showText));
    if (this.isMainWindowActive()) {
      this.hideNow();
      return;
    }
    if (s.state !== 'idle') {
      this.show();
      return;
    }
    const hasText = Boolean(s.replyText || s.notice);
    if (!this.visible) {
      if (hasText) this.show();
      else return;
    }
    const hold = hasText ? Math.min(9000, 2600 + (s.replyText.length + s.notice.length) * 45) : 900;
    this.scheduleHide(hold);
  }

  sendLevel(value: number): void {
    if (!this.visible || !this.win || this.win.isDestroyed()) return;
    this.win.webContents.send('voice:level', value);
  }

  dispose(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.win?.destroy();
    this.win = null;
  }

  private show(): void {
    const win = this.win;
    if (!win || win.isDestroyed()) return;
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = null;
    if (!this.visible) {
      this.place(win);
      win.showInactive();
      this.visible = true;
    }
    win.webContents.send('overlay:visible', true);
  }

  private scheduleHide(afterMs: number): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hideNow(), afterMs);
  }

  private hideNow(): void {
    const win = this.win;
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = null;
    if (!win || win.isDestroyed() || !this.visible) return;
    this.visible = false;
    win.webContents.send('overlay:visible', false);
    setTimeout(() => {
      if (!this.visible && !win.isDestroyed()) win.hide();
    }, FADE_MS);
  }

  private place(win: BrowserWindow): void {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const area = display.workArea;
    win.setBounds({
      x: Math.round(area.x + (area.width - WIDTH) / 2),
      y: Math.round(area.y + area.height - HEIGHT - BOTTOM_MARGIN),
      width: WIDTH,
      height: HEIGHT,
    });
  }
}
