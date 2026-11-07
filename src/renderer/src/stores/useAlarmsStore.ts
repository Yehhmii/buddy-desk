import { create } from 'zustand';
import type { Alarm, RingingAlarm } from '@shared/types';

interface AlarmsState {
  alarms: Alarm[];
  ringing: RingingAlarm[];
  load: () => Promise<void>;
  applyAlarms: (alarms: Alarm[]) => void;
  addRinging: (r: RingingAlarm) => void;
  removeRinging: (id: number) => void;
}

export const useAlarmsStore = create<AlarmsState>((set) => ({
  alarms: [],
  ringing: [],
  load: async () => {
    const [alarms, ringing] = await Promise.all([window.api.alarms.list(), window.api.alarms.ringing()]);
    set({ alarms, ringing });
  },
  applyAlarms: (alarms) => set({ alarms }),
  addRinging: (r) => set((s) => ({ ringing: [...s.ringing.filter((x) => x.alarm.id !== r.alarm.id), r] })),
  removeRinging: (id) => set((s) => ({ ringing: s.ringing.filter((x) => x.alarm.id !== id) })),
}));
