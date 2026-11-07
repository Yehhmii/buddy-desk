export type TaskStatus = 'pending' | 'done' | 'removed';
export type TaskPriority = 0 | 1; // 0 normal, 1 high
export type TaskFilter = 'pending' | 'done' | 'all';

export interface Attachment {
  id: number;
  /** File name inside the screenshots folder, never a path. */
  file: string;
  createdAt: number;
}

export interface Task {
  id: number;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: number | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  attachments: Attachment[];
}

export interface TaskInput {
  title: string;
  notes?: string;
  priority?: TaskPriority;
  dueAt?: number | null;
}

export interface TaskPatch {
  title?: string;
  notes?: string;
  priority?: TaskPriority;
  dueAt?: number | null;
}

export type TaskEventType = 'created' | 'completed' | 'reopened' | 'removed' | 'edited';

export interface TaskEvent {
  id: number;
  taskId: number;
  type: TaskEventType;
  at: number;
  title: string;
}

export type AlarmKind = 'alarm' | 'timer';

export interface Alarm {
  id: number;
  label: string;
  kind: AlarmKind;
  /** 'HH:MM' for clock alarms, null for timers. */
  time: string | null;
  /** 0 = Sunday ... 6 = Saturday. Empty means one-off. */
  repeatDays: number[];
  enabled: boolean;
  nextFireAt: number | null;
  createdAt: number;
}

export interface AlarmInput {
  label?: string;
  time?: string;
  inMinutes?: number;
  repeatDays?: number[];
}

export interface RingingAlarm {
  alarm: Alarm;
  ringingSince: number;
}

export interface AgentAction {
  tool: string;
  ok: boolean;
  summary: string;
}

export interface AgentResult {
  reply: string;
  actions: AgentAction[];
}

export interface Briefing {
  greeting: string;
  spokenText: string;
  pendingCount: number;
  highlights: Task[];
  nextAlarm: Alarm | null;
}

export interface DailyReport {
  id: number;
  date: string;
  markdown: string;
  createdAt: number;
}

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceSnapshot {
  state: VoiceState;
  userText: string;
  replyText: string;
  notice: string;
  actions: Array<{ ok: boolean; summary: string }>;
}

export type ProviderId = 'groq' | 'gemini' | 'openai' | 'anthropic';

export const PROVIDER_IDS: readonly ProviderId[] = ['groq', 'gemini', 'openai', 'anthropic'];

export interface KeyState {
  configured: boolean;
  source: 'env' | 'stored' | null;
}

export type SecretStatus = Record<ProviderId, KeyState> & { encryptionAvailable: boolean };

export interface KeyTestResult {
  ok: boolean;
  message: string;
}

/** null means no cloud speech service worked, so the app should try offline recognition. */
export type TranscribeResult = { text: string } | null;

export interface WakeModelStatus {
  installed: boolean;
  downloading: boolean;
  sizeBytes: number;
}

export interface WakeModelProgress {
  receivedBytes: number;
  totalBytes: number;
}

export interface ScreenStatus {
  attached: boolean;
  chars: number;
  capturedAt: number | null;
}

export interface AppInfo {
  version: string;
  platform: string;
  packaged: boolean;
  hotkeyRegistered: boolean;
  contentProtection: boolean;
  autostarted: boolean;
  alarmWake: { supported: boolean; scheduledFor: number | null; error: string | null };
}

export interface TtsResult {
  /** null when synthesis failed and the renderer should fall back to system voices. */
  audio: ArrayBuffer | null;
  mime: string;
}
