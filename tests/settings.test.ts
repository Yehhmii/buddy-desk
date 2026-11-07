import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SettingsPatchSchema,
  SettingsSchema,
  coerceSettings,
  deepMerge,
} from '@shared/settings';

describe('settings', () => {
  it('defaults are valid', () => {
    expect(SettingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
  });

  it('coerces empty and garbage input to defaults', () => {
    expect(coerceSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(coerceSettings('nope')).toEqual(DEFAULT_SETTINGS);
  });

  it('resets only the broken section', () => {
    const result = coerceSettings({ general: { userName: 'Ada' }, voice: { hotkey: 'nonsense' } });
    expect(result.general.userName).toBe('Ada');
    expect(result.voice).toEqual(DEFAULT_SETTINGS.voice);
  });

  it('keeps partial sections and fills the rest', () => {
    const result = coerceSettings({ voice: { wakeWord: { enabled: true } } });
    expect(result.voice.wakeWord.enabled).toBe(true);
    expect(result.voice.wakeWord.phrase).toBe('hey buddy');
  });

  it('moves saved settings off retired models', () => {
    const result = coerceSettings({
      ai: { groqModel: 'llama-3.3-70b-versatile', geminiModel: 'gemini-2.5-flash' },
    });
    expect(result.ai.groqModel).toBe(DEFAULT_SETTINGS.ai.groqModel);
    expect(result.ai.geminiModel).toBe(DEFAULT_SETTINGS.ai.geminiModel);
    expect(coerceSettings({ ai: { groqModel: 'qwen/qwen3.6-27b' } }).ai.groqModel).toBe('qwen/qwen3.6-27b');
  });

  it('deep merges nested objects', () => {
    const merged = deepMerge({ a: { b: 1, c: 2 } }, { a: { b: 5 } });
    expect(merged).toEqual({ a: { b: 5, c: 2 } });
  });

  it('rejects unknown keys and invalid wake phrases in patches', () => {
    expect(SettingsPatchSchema.safeParse({ hacker: true }).success).toBe(false);
    expect(SettingsPatchSchema.safeParse({ voice: { wakeWord: { phrase: 'a' } } }).success).toBe(false);
    const ok = SettingsPatchSchema.parse({ voice: { wakeWord: { phrase: 'Hey, Friday!' } } });
    expect(ok.voice?.wakeWord?.phrase).toBe('hey friday');
  });
});
