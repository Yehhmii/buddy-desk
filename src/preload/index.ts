import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { EVENT_NAMES, Invoke, Send, type EventName, type EventPayloads, type IpcResult } from '@shared/ipc';
import type { JarvisApi } from '@shared/api';

async function call<T>(channel: string, arg?: unknown): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, arg)) as IpcResult<T>;
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

const allowedEvents = new Set<string>(EVENT_NAMES);

const api: JarvisApi = {
  tasks: {
    list: (filter) => call(Invoke.TasksList, filter),
    create: (input) => call(Invoke.TasksCreate, input),
    update: (id, patch) => call(Invoke.TasksUpdate, { id, patch }),
    complete: (id) => call(Invoke.TasksComplete, id),
    reopen: (id) => call(Invoke.TasksReopen, id),
    remove: (id) => call(Invoke.TasksRemove, id),
  },
  alarms: {
    list: () => call(Invoke.AlarmsList),
    create: (input) => call(Invoke.AlarmsCreate, input),
    toggle: (id, enabled) => call(Invoke.AlarmsToggle, { id, enabled }),
    remove: (id) => call(Invoke.AlarmsRemove, id),
    snooze: (id, minutes) => call(Invoke.AlarmsSnooze, { id, minutes }),
    dismiss: (id) => call(Invoke.AlarmsDismiss, id),
    ringing: () => call(Invoke.AlarmsRinging),
  },
  settings: {
    get: () => call(Invoke.SettingsGet),
    update: (patch) => call(Invoke.SettingsUpdate, patch),
  },
  secrets: {
    status: () => call(Invoke.SecretsStatus),
    set: (provider, key) => call(Invoke.SecretsSet, { provider, key }),
    clear: (provider) => call(Invoke.SecretsClear, provider),
    test: (provider) => call(Invoke.SecretsTest, provider),
  },
  agent: {
    run: (text) => call(Invoke.AgentRun, { text }),
    reset: () => call(Invoke.AgentReset),
  },
  speech: {
    transcribe: (wav) => call(Invoke.SttTranscribe, wav),
    synthesize: (text) => call(Invoke.TtsSynthesize, { text }),
  },
  screen: {
    attach: () => call(Invoke.ScreenAttach),
    clear: () => call(Invoke.ScreenClear),
    status: () => call(Invoke.ScreenStatus),
  },
  screenshots: {
    capture: (input) => call(Invoke.ScreenshotCapture, input),
    removeAttachment: (taskId, attachmentId) => call(Invoke.AttachmentRemove, { taskId, attachmentId }),
    reveal: (file) => call(Invoke.ScreenshotReveal, file),
  },
  briefing: { get: () => call(Invoke.BriefingGet) },
  report: {
    generate: () => call(Invoke.ReportGenerate),
    latest: () => call(Invoke.ReportLatest),
    exportPdf: () => call(Invoke.ReportExportPdf),
  },
  wake: {
    modelStatus: () => call(Invoke.WakeModelStatus),
    downloadModel: () => call(Invoke.WakeModelDownload),
  },
  app: { info: () => call(Invoke.AppInfo) },
  voice: {
    report: (snapshot) => call(Invoke.VoiceReport, snapshot),
    level: (value) => ipcRenderer.send(Send.VoiceLevel, value),
    trigger: () => call(Invoke.VoiceTrigger),
  },
  diagnostics: { report: (message) => call(Invoke.DiagnosticsReport, message) },
  on<E extends EventName>(event: E, listener: (payload: EventPayloads[E]) => void) {
    if (!allowedEvents.has(event)) throw new Error(`Unknown event ${event}`);
    const wrapped = (_e: IpcRendererEvent, payload: EventPayloads[E]): void => listener(payload);
    ipcRenderer.on(event, wrapped);
    return () => ipcRenderer.removeListener(event, wrapped);
  },
};

contextBridge.exposeInMainWorld('api', api);
