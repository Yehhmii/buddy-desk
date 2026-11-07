import { app, ipcMain, shell } from 'electron';
import { z } from 'zod';
import { Invoke, Send } from '@shared/ipc';
import { LIMITS } from '@shared/constants';
import {
  AgentRunSchema,
  AlarmInputSchema,
  AlarmSnoozeSchema,
  AlarmToggleSchema,
  IdSchema,
  ProviderSchema,
  SecretSetSchema,
  TaskFilterSchema,
  TaskInputSchema,
  TaskPatchSchema,
  TtsRequestSchema,
  VoiceSnapshotSchema,
  DiagnosticSchema,
  ScreenshotRequestSchema,
  AttachmentRemoveSchema,
  ScreenshotFileSchema,
} from '@shared/schemas';
import type { AppInfo } from '@shared/types';
import type { WindowManager } from '../app/WindowManager';
import type { ShortcutService } from '../app/ShortcutService';
import type { OverlayWindow } from '../app/OverlayWindow';
import type { Broadcaster } from '../core/Broadcaster';
import { logger } from '../core/logger';
import { isTrustedSender } from '../app/security';
import { launchedAtLogin } from '../app/loginItem';
import { exportReportPdf } from '../services/reports/ReportPdfExporter';
import type { Container } from '../container';
import { handle } from './handle';

const AudioSchema = z
  .union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)])
  .refine((b) => b.byteLength > 44 && b.byteLength <= LIMITS.audioBytes);

export interface IpcDeps {
  c: Container;
  windows: WindowManager;
  shortcuts: ShortcutService;
  overlay: OverlayWindow;
  broadcaster: Broadcaster;
}

export function registerIpc({ c, windows, shortcuts, overlay, broadcaster }: IpcDeps): void {
  // Tasks
  handle(Invoke.TasksList, TaskFilterSchema, (filter) => c.tasks.list(filter));
  handle(Invoke.TasksCreate, TaskInputSchema, (input) => c.tasks.create(input));
  handle(Invoke.TasksUpdate, TaskPatchSchema, ({ id, patch }) => c.tasks.update(id, patch));
  handle(Invoke.TasksComplete, IdSchema, (id) => c.tasks.complete(id));
  handle(Invoke.TasksReopen, IdSchema, (id) => c.tasks.reopen(id));
  handle(Invoke.TasksRemove, IdSchema, (id) => void c.tasks.remove(id));

  // Alarms
  handle(Invoke.AlarmsList, null, () => c.alarms.list());
  handle(Invoke.AlarmsCreate, AlarmInputSchema, (input) => c.alarms.create(input));
  handle(Invoke.AlarmsToggle, AlarmToggleSchema, ({ id, enabled }) => c.alarms.toggle(id, enabled));
  handle(Invoke.AlarmsRemove, IdSchema, (id) => {
    c.alarmScheduler.dismiss(id);
    c.alarms.remove(id);
  });
  handle(Invoke.AlarmsSnooze, AlarmSnoozeSchema, ({ id, minutes }) => c.alarmScheduler.snooze(id, minutes));
  handle(Invoke.AlarmsDismiss, IdSchema, (id) => c.alarmScheduler.dismiss(id));
  handle(Invoke.AlarmsRinging, null, () => c.alarmScheduler.getRinging());

  // Settings and secrets
  handle(Invoke.SettingsGet, null, () => c.settings.get());
  handle(Invoke.SettingsUpdate, z.unknown(), (patch) => c.settings.update(patch));
  handle(Invoke.SecretsStatus, null, () => c.secrets.status());
  handle(Invoke.SecretsSet, SecretSetSchema, ({ provider, key }) => c.secrets.set(provider, key));
  handle(Invoke.SecretsClear, ProviderSchema, (provider) => c.secrets.clear(provider));
  handle(Invoke.SecretsTest, ProviderSchema, (provider) => c.router.probe(provider));

  // Assistant
  handle(Invoke.AgentRun, AgentRunSchema, ({ text }) => c.agent.run(text));
  handle(Invoke.AgentReset, null, () => c.agent.reset());
  handle(Invoke.SttTranscribe, AudioSchema, (wav) =>
    c.stt.transcribe(Buffer.from(wav instanceof ArrayBuffer ? new Uint8Array(wav) : wav)),
  );
  handle(Invoke.TtsSynthesize, TtsRequestSchema, ({ text }) => c.tts.synthesize(text));

  // Screen
  handle(Invoke.ScreenAttach, null, () => c.screen.attach());
  handle(Invoke.ScreenClear, null, () => c.screen.clear());
  handle(Invoke.ScreenStatus, null, () => c.screen.status());

  // Screenshots saved onto tasks
  handle(Invoke.ScreenshotCapture, ScreenshotRequestSchema, (req) => c.screenshots.take(req));
  handle(Invoke.AttachmentRemove, AttachmentRemoveSchema, ({ taskId, attachmentId }) =>
    c.screenshots.remove(taskId, attachmentId),
  );
  handle(Invoke.ScreenshotReveal, ScreenshotFileSchema, (file) => {
    const path = c.screenshots.filePath(file);
    if (path) shell.showItemInFolder(path);
  });

  // Briefing and reports
  handle(Invoke.BriefingGet, null, () => c.briefing.compose());
  handle(Invoke.ReportGenerate, null, () => c.reports.generate());
  handle(Invoke.ReportLatest, null, () => c.reports.latest());
  handle(Invoke.ReportExportPdf, null, async () => {
    const report = c.reports.latest() ?? (await c.reports.generate());
    return exportReportPdf(report, windows.window());
  });

  // Voice mirror for the overlay, and diagnostics from the UI
  handle(Invoke.VoiceReport, VoiceSnapshotSchema, (snapshot) => overlay.onSnapshot(snapshot));
  handle(Invoke.VoiceTrigger, null, () => broadcaster.emit('voice:toggle', undefined));
  handle(Invoke.DiagnosticsReport, DiagnosticSchema, (message) => logger.error(`UI error: ${message}`));
  ipcMain.on(Send.VoiceLevel, (event, value: unknown) => {
    if (!isTrustedSender(event as never) || typeof value !== 'number' || !Number.isFinite(value)) return;
    overlay.sendLevel(Math.max(0, Math.min(1, value)));
  });

  // Wake word model and app info
  handle(Invoke.WakeModelStatus, null, () => c.wakeModel.status());
  handle(Invoke.WakeModelDownload, null, () => c.wakeModel.download());
  handle(Invoke.AppInfo, null, (): AppInfo => ({
    version: app.getVersion(),
    platform: process.platform,
    packaged: app.isPackaged,
    hotkeyRegistered: shortcuts.isRegistered(),
    contentProtection: windows.isProtected(),
    autostarted: launchedAtLogin(),
    alarmWake: c.sleepWake.getStatus(),
  }));
}
