import { create } from 'zustand';
import type { WakeModelProgress, WakeModelStatus } from '@shared/types';

export type WakeRuntime = 'off' | 'loading' | 'listening' | 'error';

interface WakeState {
  runtime: WakeRuntime;
  error: string | null;
  model: WakeModelStatus | null;
  progress: WakeModelProgress | null;
  setRuntime: (runtime: WakeRuntime, error?: string | null) => void;
  setModel: (model: WakeModelStatus) => void;
  setProgress: (progress: WakeModelProgress | null) => void;
}

export const useWakeStore = create<WakeState>((set) => ({
  runtime: 'off',
  error: null,
  model: null,
  progress: null,
  setRuntime: (runtime, error = null) => set({ runtime, error }),
  setModel: (model) => set({ model }),
  setProgress: (progress) => set({ progress }),
}));
