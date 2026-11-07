import type {
  AgentResult,
  Alarm,
  AppInfo,
  DailyReport,
  RingingAlarm,
  ScreenStatus,
  Task,
  VoiceSnapshot,
  WakeModelProgress,
} from './types';
import type { AppSettings } from './settings';

/** Request/response channels (renderer -> main). */
export const Invoke = {
  TasksList: 'tasks:list',
  TasksCreate: 'tasks:create',
  TasksUpdate: 'tasks:update',
  TasksComplete: 'tasks:complete',
  TasksReopen: 'tasks:reopen',
  TasksRemove: 'tasks:remove',
  AlarmsList: 'alarms:list',
  AlarmsCreate: 'alarms:create',
  AlarmsToggle: 'alarms:toggle',
  AlarmsRemove: 'alarms:remove',
  AlarmsSnooze: 'alarms:snooze',
  AlarmsDismiss: 'alarms:dismiss',
  AlarmsRinging: 'alarms:ringing',
  SettingsGet: 'settings:get',
  SettingsUpdate: 'settings:update',
  SecretsStatus: 'secrets:status',
  SecretsSet: 'secrets:set',
  SecretsClear: 'secrets:clear',
  SecretsTest: 'secrets:test',
  AgentRun: 'agent:run',
  AgentReset: 'agent:reset',
  SttTranscribe: 'stt:transcribe',
  TtsSynthesize: 'tts:synthesize',
  ScreenAttach: 'screen:attach',
  ScreenClear: 'screen:clear',
  ScreenStatus: 'screen:status',
  BriefingGet: 'briefing:get',
  ReportGenerate: 'report:generate',
  ReportLatest: 'report:latest',
  ReportExportPdf: 'report:export-pdf',
  WakeModelStatus: 'wake:model-status',
  WakeModelDownload: 'wake:model-download',
  AppInfo: 'app:info',
  ScreenshotCapture: 'screenshot:capture',
  ScreenshotReveal: 'screenshot:reveal',
  AttachmentRemove: 'attachments:remove',
  VoiceReport: 'voice:report',
  VoiceTrigger: 'voice:trigger',
  DiagnosticsReport: 'diagnostics:report',
} as const;

/** Fire-and-forget messages (renderer -> main). */
export const Send = { VoiceLevel: 'voice:level' } as const;

export type InvokeChannel = (typeof Invoke)[keyof typeof Invoke];

/** Push events (main -> renderer) and their payloads. */
export interface EventPayloads {
  'tasks:changed': Task[];
  'alarms:changed': Alarm[];
  'alarms:ring': RingingAlarm;
  'alarms:stop': { id: number };
  'settings:changed': AppSettings;
  'voice:toggle': undefined;
  'report:ready': DailyReport;
  'report:announce': DailyReport;
  'wake:model-progress': WakeModelProgress;
  'screen:changed': ScreenStatus;
  'app:navigate': 'today' | 'alarms' | 'report' | 'settings';
  'voice:snapshot': VoiceSnapshot;
  'voice:level': number;
  'overlay:visible': boolean;
}

export type EventName = keyof EventPayloads;

export const EVENT_NAMES: readonly EventName[] = [
  'tasks:changed',
  'alarms:changed',
  'alarms:ring',
  'alarms:stop',
  'settings:changed',
  'voice:toggle',
  'report:ready',
  'report:announce',
  'wake:model-progress',
  'screen:changed',
  'app:navigate',
  'voice:snapshot',
  'voice:level',
  'overlay:visible',
];

/** Every invoke goes through this envelope so errors cross the bridge as plain data. */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type { AgentResult, AppInfo };
