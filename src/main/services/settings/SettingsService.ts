import {
  coerceSettings,
  deepMerge,
  SettingsPatchSchema,
  SettingsSchema,
  type AppSettings,
  type SettingsPatch,
} from '@shared/settings';
import type { KvRepository } from '../../db/repositories/KvRepository';
import type { Broadcaster } from '../../core/Broadcaster';
import { logger } from '../../core/logger';

const KEY = 'settings';

type Listener = (next: AppSettings, prev: AppSettings) => void;

export class SettingsService {
  private current: AppSettings;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly kv: KvRepository,
    private readonly broadcaster: Broadcaster,
  ) {
    this.current = this.load();
  }

  private load(): AppSettings {
    const raw = this.kv.get(KEY);
    if (!raw) return coerceSettings({});
    try {
      return coerceSettings(JSON.parse(raw));
    } catch (error) {
      logger.warn('Stored settings were unreadable, using defaults', error);
      return coerceSettings({});
    }
  }

  get(): AppSettings {
    return this.current;
  }

  update(patchInput: unknown): AppSettings {
    const patch: SettingsPatch = SettingsPatchSchema.parse(patchInput);
    const merged = deepMerge(this.current, patch);
    const next = SettingsSchema.parse(merged);
    const prev = this.current;
    this.current = next;
    this.kv.set(KEY, JSON.stringify(next));
    for (const listener of this.listeners) listener(next, prev);
    this.broadcaster.emit('settings:changed', next);
    return next;
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
