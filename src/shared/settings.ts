import { z } from 'zod';
import { CHARACTER_IDS } from './characters';
import { HHMM_PATTERN } from './time';
import { isValidAccelerator } from './hotkey';
import { isValidWakePhrase, normalizeWakePhrase } from './wakeWord';

const GeneralSchema = z.object({
  userName: z.string().trim().max(40),
  launchAtLogin: z.boolean(),
  onboarded: z.boolean(),
  autoUpdate: z.boolean(),
  closeToTray: z.boolean(),
  startHidden: z.boolean(),
  wakeForAlarms: z.boolean(),
  briefingOnLaunch: z.boolean(),
  speakBriefing: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
});

const PrivacySchema = z.object({
  hideFromCapture: z.boolean(),
  redactSensitiveText: z.boolean(),
  allowVisionUpload: z.boolean(),
});

const WakeWordSchema = z.object({
  enabled: z.boolean(),
  phrase: z
    .string()
    .refine(isValidWakePhrase, 'Use 1 to 3 plain English words')
    .transform(normalizeWakePhrase),
  sensitivity: z.enum(['low', 'medium', 'high']),
});

const VoiceSchema = z.object({
  hotkey: z.string().refine(isValidAccelerator, 'Not a valid shortcut'),
  speakReplies: z.boolean(),
  conversationMode: z.boolean(),
  endPhrase: z
    .string()
    .refine(isValidWakePhrase, 'Use 1 to 3 plain English words')
    .transform(normalizeWakePhrase),
  followUpSeconds: z.number().int().min(4).max(30),
  showOverlay: z.boolean(),
  overlayShowText: z.boolean(),
  voiceName: z.string().regex(/^[A-Za-z0-9-]{3,60}$/),
  speechRate: z.number().int().min(-50).max(50),
  silenceMs: z.number().int().min(600).max(3000),
  chime: z.boolean(),
  wakeWord: WakeWordSchema,
});

const AppearanceSchema = z.object({
  character: z.enum(CHARACTER_IDS),
  orbColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a colour like #0a84ff')
    .transform((c) => c.toLowerCase()),
});

const AiSchema = z.object({
  provider: z.enum(['auto', 'groq', 'gemini', 'openai', 'anthropic']),
  groqModel: z.string().regex(/^[\w.\-/:]{2,80}$/),
  geminiModel: z.string().regex(/^[\w.\-/:]{2,80}$/),
  openaiModel: z.string().regex(/^[\w.\-/:]{2,80}$/),
  anthropicModel: z.string().regex(/^[\w.\-/:]{2,80}$/),
  openaiSttModel: z.string().regex(/^[\w.\-/:]{2,80}$/),
  sttModel: z.string().regex(/^[\w.\-/:]{2,80}$/),
});

const ReportSchema = z.object({
  autoDaily: z.boolean(),
  askToRead: z.boolean(),
  time: z.string().regex(HHMM_PATTERN),
});

export const SettingsSchema = z.object({
  general: GeneralSchema,
  privacy: PrivacySchema,
  voice: VoiceSchema,
  appearance: AppearanceSchema,
  ai: AiSchema,
  report: ReportSchema,
});

export type AppSettings = z.infer<typeof SettingsSchema>;

type Section = keyof AppSettings;

export const SettingsPatchSchema = z
  .object({
    general: GeneralSchema.partial(),
    privacy: PrivacySchema.partial(),
    voice: VoiceSchema.omit({ wakeWord: true }).extend({ wakeWord: WakeWordSchema.partial() }).partial(),
    appearance: AppearanceSchema.partial(),
    ai: AiSchema.partial(),
    report: ReportSchema.partial(),
  })
  .partial()
  .strict();

export type SettingsPatch = z.input<typeof SettingsPatchSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    userName: '',
    launchAtLogin: true,
    onboarded: false,
    autoUpdate: true,
    closeToTray: true,
    startHidden: false,
    wakeForAlarms: true,
    briefingOnLaunch: true,
    speakBriefing: false,
    theme: 'light',
  },
  privacy: { hideFromCapture: true, redactSensitiveText: true, allowVisionUpload: true },
  voice: {
    hotkey: 'Control+Shift+J',
    speakReplies: true,
    conversationMode: true,
    endPhrase: 'goodbye',
    followUpSeconds: 8,
    showOverlay: true,
    overlayShowText: true,
    voiceName: 'en-GB-RyanNeural',
    speechRate: 0,
    silenceMs: 1200,
    chime: true,
    wakeWord: { enabled: false, phrase: 'hey buddy', sensitivity: 'medium' },
  },
  appearance: { character: 'orb', orbColor: '#0a84ff' },
  ai: {
    provider: 'auto',
    groqModel: 'openai/gpt-oss-120b',
    geminiModel: 'gemini-flash-latest',
    openaiModel: 'gpt-5.4-mini',
    anthropicModel: 'claude-haiku-5-5',
    openaiSttModel: 'gpt-4o-mini-transcribe',
    sttModel: 'whisper-large-v3-turbo',
  },
  report: { autoDaily: true, askToRead: true, time: '18:00' },
};

/** Models the providers have shut down. Saved settings that still name one are moved to the current default. */
const RETIRED_MODELS: Record<'groqModel' | 'geminiModel' | 'openaiModel', ReadonlySet<string>> = {
  openaiModel: new Set([
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'o3',
    'o4-mini',
    'gpt-3.5-turbo',
  ]),
  groqModel: new Set([
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'qwen/qwen3-32b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
  ]),
  geminiModel: new Set([
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
  ]),
};

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merge plain objects. Arrays and primitives from `over` replace `base`. */
export function deepMerge<T>(base: T, over: unknown): T {
  if (!isObject(base) || !isObject(over)) return (over === undefined ? base : over) as T;
  const out: Json = { ...base };
  for (const [key, value] of Object.entries(over)) {
    out[key] = key in base ? deepMerge((base as Json)[key], value) : value;
  }
  return out as T;
}

/**
 * Builds valid settings from anything stored on disk. Each section is validated on
 * its own, so one corrupt value only resets that section instead of everything.
 */
export function coerceSettings(stored: unknown): AppSettings {
  const source = isObject(stored) ? stored : {};
  const result = { ...DEFAULT_SETTINGS } as Record<Section, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as Section[]) {
    const merged = deepMerge(DEFAULT_SETTINGS[key], source[key]);
    if (key === 'ai') upgradeRetiredModels(merged as AppSettings['ai']);
    const parsed = SettingsSchema.shape[key].safeParse(merged);
    result[key] = parsed.success ? parsed.data : DEFAULT_SETTINGS[key];
  }
  return result as AppSettings;
}

function upgradeRetiredModels(ai: AppSettings['ai']): void {
  for (const field of ['groqModel', 'geminiModel', 'openaiModel'] as const) {
    if (RETIRED_MODELS[field].has(ai[field])) ai[field] = DEFAULT_SETTINGS.ai[field];
  }
}
