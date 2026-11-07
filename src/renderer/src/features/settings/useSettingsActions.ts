import { useCallback } from 'react';
import type { SettingsPatch } from '@shared/settings';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';

/** Saves a settings patch and reports a rejected value instead of failing silently. */
export function useSave(): (patch: SettingsPatch) => Promise<boolean> {
  const update = useSettingsStore((s) => s.update);
  return useCallback(
    async (patch) => {
      try {
        await update(patch);
        return true;
      } catch (e) {
        useUiStore.getState().pushEntry({
          role: 'notice',
          text: e instanceof Error ? e.message : 'Could not save that setting.',
        });
        return false;
      }
    },
    [update],
  );
}
