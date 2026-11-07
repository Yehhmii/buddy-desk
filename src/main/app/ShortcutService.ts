import { globalShortcut } from 'electron';
import { logger } from '../core/logger';

/** Owns the single global push-to-talk shortcut. Re-registers when the setting changes. */
export class ShortcutService {
  private current: string | null = null;
  private registered = false;

  constructor(private readonly onPress: () => void) {}

  register(accelerator: string): boolean {
    this.unregister();
    try {
      this.registered = globalShortcut.register(accelerator, this.onPress);
    } catch (error) {
      logger.warn(`Invalid shortcut ${accelerator}`, error);
      this.registered = false;
    }
    if (this.registered) this.current = accelerator;
    else logger.warn(`Shortcut ${accelerator} is taken by another app`);
    return this.registered;
  }

  unregister(): void {
    if (this.current) globalShortcut.unregister(this.current);
    this.current = null;
    this.registered = false;
  }

  isRegistered(): boolean {
    return this.registered;
  }
}
