import { create } from 'zustand';
import type { AppSettings, SettingsPatch } from '@shared/settings';

interface SettingsState {
  settings: AppSettings | null;
  load: () => Promise<void>;
  update: (patch: SettingsPatch) => Promise<void>;
  apply: (next: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  load: async () => set({ settings: await window.api.settings.get() }),
  update: async (patch) => set({ settings: await window.api.settings.update(patch) }),
  apply: (next) => set({ settings: next }),
}));
