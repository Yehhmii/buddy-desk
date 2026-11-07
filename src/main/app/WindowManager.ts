import { join } from 'node:path';
import { BrowserWindow, nativeTheme } from 'electron';
import { logger } from '../core/logger';
import type { AppSettings } from '@shared/settings';
import { paths } from '../config/paths';

const COLORS = {
  light: { bg: '#fbfbfd', symbol: '#1d1d1f' },
  dark: { bg: '#0f0f11', symbol: '#f5f5f7' },
};

export class WindowManager {
  private main: BrowserWindow | null = null;
  private quitting = false;
  private protect = true;

  constructor(
    private closeToTray: boolean,
    private readonly quitApp: () => void,
  ) {}

  markQuitting(): void {
    this.quitting = true;
  }

  create(show = true): BrowserWindow {
    const win = new BrowserWindow({
      width: 1120,
      height: 760,
      minWidth: 900,
      minHeight: 620,
      show: false,
      backgroundColor: COLORS.light.bg,
      title: 'Jarvis Desk',
      icon: paths.appIcon(),
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      ...(process.platform === 'darwin'
        ? { trafficLightPosition: { x: 20, y: 18 } }
        : { titleBarOverlay: { color: COLORS.light.bg, symbolColor: COLORS.light.symbol, height: 44 } }),
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        spellcheck: false,
        autoplayPolicy: 'no-user-gesture-required',
        // This window hosts the voice engine. It must keep running while hidden in the tray.
        backgroundThrottling: false,
      },
    });

    win.setContentProtection(this.protect);
    win.once('ready-to-show', () => {
      if (show) win.show();
    });
    win.on('close', (event) => {
      if (this.quitting) return;
      // The voice engine lives in this window, so it is never destroyed while the app runs.
      event.preventDefault();
      if (this.closeToTray) win.hide();
      else this.quitApp();
    });
    win.webContents.on('render-process-gone', (_e, details) => {
      logger.error(`Main renderer gone: ${details.reason}`);
      if (details.reason !== 'clean-exit' && !win.isDestroyed()) win.reload();
    });
    win.on('closed', () => {
      if (this.main === win) this.main = null;
    });

    const devUrl = process.env['ELECTRON_RENDERER_URL'];
    if (devUrl) void win.loadURL(devUrl);
    else void win.loadFile(join(__dirname, '../renderer/index.html'));

    this.main = win;
    return win;
  }

  window(): BrowserWindow | null {
    return this.main && !this.main.isDestroyed() ? this.main : null;
  }

  show(): void {
    const win = this.window() ?? this.create();
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }

  /**
   * Makes every visible window of this app fully transparent so a screenshot shows what is behind
   * it. Resolves once the change has reached the screen. Call the returned function to undo it.
   */
  async concealForCapture(): Promise<() => void> {
    const hidden = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed() && w.isVisible());
    for (const w of hidden) w.setOpacity(0);
    if (hidden.length > 0) await new Promise((resolve) => setTimeout(resolve, 200));
    return () => {
      for (const w of hidden) if (!w.isDestroyed()) w.setOpacity(1);
    };
  }

  /** True while the window is visible and focused, so the overlay can stay out of the way. */
  isActive(): boolean {
    const win = this.window();
    return Boolean(win && win.isVisible() && !win.isMinimized() && win.isFocused());
  }

  toggle(): void {
    const win = this.window();
    if (win?.isVisible() && win.isFocused()) win.hide();
    else this.show();
  }

  applySettings(settings: AppSettings): void {
    this.closeToTray = settings.general.closeToTray;
    this.protect = settings.privacy.hideFromCapture;
    nativeTheme.themeSource = settings.general.theme;
    const palette = nativeTheme.shouldUseDarkColors ? COLORS.dark : COLORS.light;
    if (this.main && !this.main.isDestroyed()) {
      this.main.setContentProtection(this.protect);
      this.main.setBackgroundColor(palette.bg);
      if (process.platform === 'win32') {
        this.main.setTitleBarOverlay({ color: palette.bg, symbolColor: palette.symbol });
      }
    }
  }

  isProtected(): boolean {
    return this.protect;
  }
}
