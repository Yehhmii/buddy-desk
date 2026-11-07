import { create } from 'zustand';
import type { Briefing, DailyReport, ScreenStatus, VoiceState } from '@shared/types';

export type View = 'today' | 'alarms' | 'report' | 'settings';

export interface ConversationEntry {
  id: number;
  role: 'user' | 'assistant' | 'notice';
  text: string;
  actions?: Array<{ ok: boolean; summary: string }>;
}

interface UiState {
  view: View;
  voiceState: VoiceState;
  conversation: boolean;
  entries: ConversationEntry[];
  screen: ScreenStatus;
  briefing: Briefing | null;
  report: DailyReport | null;
  setView: (v: View) => void;
  setVoiceState: (s: VoiceState) => void;
  setConversation: (active: boolean) => void;
  pushEntry: (e: Omit<ConversationEntry, 'id'>) => void;
  clearEntries: () => void;
  setScreen: (s: ScreenStatus) => void;
  setBriefing: (b: Briefing | null) => void;
  setReport: (r: DailyReport | null) => void;
}

let nextId = 1;
const MAX_ENTRIES = 40;

export const useUiStore = create<UiState>((set) => ({
  view: 'today',
  voiceState: 'idle',
  conversation: false,
  entries: [],
  screen: { attached: false, chars: 0, capturedAt: null },
  briefing: null,
  report: null,
  setView: (view) => set({ view }),
  setVoiceState: (voiceState) => set({ voiceState }),
  setConversation: (conversation) => set({ conversation }),
  pushEntry: (e) => set((s) => ({ entries: [...s.entries, { ...e, id: nextId++ }].slice(-MAX_ENTRIES) })),
  clearEntries: () => set({ entries: [] }),
  setScreen: (screen) => set({ screen }),
  setBriefing: (briefing) => set({ briefing }),
  setReport: (report) => set({ report }),
}));
