import type { Db } from './db/database';
import { AlarmRepository } from './db/repositories/AlarmRepository';
import { KvRepository } from './db/repositories/KvRepository';
import { ReportRepository } from './db/repositories/ReportRepository';
import { SecretRepository } from './db/repositories/SecretRepository';
import { TaskRepository } from './db/repositories/TaskRepository';
import type { Broadcaster } from './core/Broadcaster';
import { AgentService } from './services/ai/AgentService';
import { ConversationMemory } from './services/ai/ConversationMemory';
import { LlmRouter } from './services/ai/LlmRouter';
import { AnthropicProvider } from './services/ai/AnthropicProvider';
import { OpenAICompatProvider } from './services/ai/OpenAICompatProvider';
import { ToolExecutor } from './services/ai/ToolExecutor';
import { AlarmScheduler } from './services/alarms/AlarmScheduler';
import { AlarmService } from './services/alarms/AlarmService';
import { SleepWakeService } from './services/alarms/SleepWakeService';
import { BriefingService } from './services/briefing/BriefingService';
import { DailyReportScheduler } from './services/reports/DailyReportScheduler';
import { ReportAnnouncer } from './services/reports/ReportAnnouncer';
import { ReportService } from './services/reports/ReportService';
import { OcrService } from './services/screen/OcrService';
import { ScreenCaptureService } from './services/screen/ScreenCaptureService';
import { ScreenshotService } from './services/screenshot/ScreenshotService';
import { ScreenContextService } from './services/screen/ScreenContextService';
import { SecretsService } from './services/secrets/SecretsService';
import { SettingsService } from './services/settings/SettingsService';
import { SttService } from './services/speech/SttService';
import { TtsService } from './services/speech/TtsService';
import { TaskService } from './services/tasks/TaskService';
import { UpdateService } from './services/updates/UpdateService';
import { WakeModelService } from './services/wake/WakeModelService';

export interface Container {
  settings: SettingsService;
  secrets: SecretsService;
  tasks: TaskService;
  alarms: AlarmService;
  alarmScheduler: AlarmScheduler;
  sleepWake: SleepWakeService;
  ocr: OcrService;
  screen: ScreenContextService;
  screenshots: ScreenshotService;
  router: LlmRouter;
  agent: AgentService;
  stt: SttService;
  tts: TtsService;
  briefing: BriefingService;
  reports: ReportService;
  reportScheduler: DailyReportScheduler;
  announcer: ReportAnnouncer;
  wakeModel: WakeModelService;
  updates: UpdateService;
}

export interface ShellHooks {
  showWindow: () => void;
  navigate: (view: 'today' | 'alarms' | 'report' | 'settings') => void;
  concealWindows: () => Promise<() => void>;
}

/** The one place where concrete classes are wired together. Everything else takes interfaces or instances. */
export function createContainer(db: Db, broadcaster: Broadcaster, shell: ShellHooks): Container {
  const kv = new KvRepository(db);
  const settings = new SettingsService(kv, broadcaster);
  const secrets = new SecretsService(new SecretRepository(db));

  const tasks = new TaskService(new TaskRepository(db), broadcaster);
  const alarms = new AlarmService(new AlarmRepository(db), broadcaster);
  const alarmScheduler = new AlarmScheduler(
    alarms,
    broadcaster,
    () => {
      shell.showWindow();
      shell.navigate('alarms');
    },
    () => shell.showWindow(),
  );
  const sleepWake = new SleepWakeService(alarms, settings);

  const ocr = new OcrService();
  const capture = new ScreenCaptureService();
  const screen = new ScreenContextService(capture, ocr, settings, broadcaster);
  const screenshots = new ScreenshotService(capture, tasks, shell.concealWindows);

  const router = new LlmRouter(
    [
      new OpenAICompatProvider({
        id: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        supportsVision: false,
        getKey: () => secrets.get('groq'),
        getModel: () => settings.get().ai.groqModel,
        // gpt-oss models think before answering. Low effort keeps voice replies fast.
        extraBody: (model) => (model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
      }),
      new OpenAICompatProvider({
        id: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        supportsVision: true,
        thoughtSignatures: true,
        getKey: () => secrets.get('gemini'),
        getModel: () => settings.get().ai.geminiModel,
      }),
      new OpenAICompatProvider({
        id: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        supportsVision: true,
        modernOpenAI: true,
        getKey: () => secrets.get('openai'),
        getModel: () => settings.get().ai.openaiModel,
      }),
      new AnthropicProvider({
        getKey: () => secrets.get('anthropic'),
        getModel: () => settings.get().ai.anthropicModel,
      }),
    ],
    () => settings.get(),
  );

  const reports = new ReportService(new ReportRepository(db), tasks, router, settings);
  const announcer = new ReportAnnouncer(broadcaster, settings);
  const reportScheduler = new DailyReportScheduler(
    reports,
    settings,
    kv,
    broadcaster,
    () => {
      shell.showWindow();
      shell.navigate('report');
    },
    (report) => announcer.announce(report),
  );

  const executor = new ToolExecutor(tasks, alarms, screen, reports, screenshots, shell.showWindow);
  const agent = new AgentService(router, executor, new ConversationMemory(), tasks, alarms, screen, settings);

  return {
    settings,
    secrets,
    tasks,
    alarms,
    alarmScheduler,
    sleepWake,
    ocr,
    screen,
    screenshots,
    router,
    agent,
    stt: new SttService(secrets, settings),
    tts: new TtsService(settings),
    briefing: new BriefingService(tasks, alarms, settings),
    reports,
    reportScheduler,
    announcer,
    updates: new UpdateService(settings),
    wakeModel: new WakeModelService((p) => broadcaster.emit('wake:model-progress', p)),
  };
}
