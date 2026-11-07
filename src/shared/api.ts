import type {
  AgentResult,
  Alarm,
  VoiceSnapshot,
  AlarmInput,
  AppInfo,
  Briefing,
  DailyReport,
  RingingAlarm,
  ScreenStatus,
  SecretStatus,
  KeyTestResult,
  TranscribeResult,
  Task,
  TaskFilter,
  TaskInput,
  TaskPatch,
  TtsResult,
  WakeModelStatus,
  ProviderId,
} from './types';
import type { AppSettings, SettingsPatch } from './settings';
import type { EventName, EventPayloads } from './ipc';

export type Unsubscribe = () => void;

/** The only surface the renderer can use to reach the main process. */
export interface JarvisApi {
  tasks: {
    list(filter: TaskFilter): Promise<Task[]>;
    create(input: TaskInput): Promise<Task>;
    update(id: number, patch: TaskPatch): Promise<Task>;
    complete(id: number): Promise<Task>;
    reopen(id: number): Promise<Task>;
    remove(id: number): Promise<void>;
  };
  alarms: {
    list(): Promise<Alarm[]>;
    create(input: AlarmInput): Promise<Alarm>;
    toggle(id: number, enabled: boolean): Promise<Alarm>;
    remove(id: number): Promise<void>;
    snooze(id: number, minutes: number): Promise<void>;
    dismiss(id: number): Promise<void>;
    ringing(): Promise<RingingAlarm[]>;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(patch: SettingsPatch): Promise<AppSettings>;
  };
  secrets: {
    status(): Promise<SecretStatus>;
    set(provider: ProviderId, key: string): Promise<SecretStatus>;
    clear(provider: ProviderId): Promise<SecretStatus>;
    /** Sends a tiny request to check the saved key and model name. */
    test(provider: ProviderId): Promise<KeyTestResult>;
  };
  agent: {
    run(text: string): Promise<AgentResult>;
    reset(): Promise<void>;
  };
  speech: {
    /** null means no cloud speech service is set up, so the caller should use the offline engine. */
    transcribe(wav: ArrayBuffer): Promise<TranscribeResult>;
    synthesize(text: string): Promise<TtsResult>;
  };
  screen: {
    attach(): Promise<ScreenStatus>;
    clear(): Promise<ScreenStatus>;
    status(): Promise<ScreenStatus>;
  };
  screenshots: {
    /** Saves a screenshot and attaches it to a task (existing, or a new one). */
    capture(input: { taskId?: number; title?: string; note?: string }): Promise<Task>;
    removeAttachment(taskId: number, attachmentId: number): Promise<Task>;
    reveal(file: string): Promise<void>;
  };
  briefing: { get(): Promise<Briefing> };
  report: {
    generate(): Promise<DailyReport>;
    latest(): Promise<DailyReport | null>;
    exportPdf(): Promise<string | null>;
  };
  wake: {
    modelStatus(): Promise<WakeModelStatus>;
    downloadModel(): Promise<WakeModelStatus>;
  };
  app: { info(): Promise<AppInfo> };
  voice: {
    /** Sent by the window that hosts the voice engine so the overlay can mirror it. */
    report(snapshot: VoiceSnapshot): Promise<void>;
    /** Live loudness, 0 to 1, fire and forget. */
    level(value: number): void;
    /** Same as pressing the talk shortcut. */
    trigger(): Promise<void>;
  };
  diagnostics: { report(message: string): Promise<void> };
  on<E extends EventName>(event: E, listener: (payload: EventPayloads[E]) => void): Unsubscribe;
}
