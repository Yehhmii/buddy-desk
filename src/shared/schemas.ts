import { z } from 'zod';
import { LIMITS, SHOT_FILE_PATTERN } from './constants';
import { HHMM_PATTERN } from './time';

const id = z.number().int().positive();

export const TaskInputSchema = z.object({
  title: z.string().trim().min(1).max(LIMITS.taskTitle),
  notes: z.string().max(LIMITS.taskNotes).optional(),
  priority: z.union([z.literal(0), z.literal(1)]).optional(),
  dueAt: z.number().int().nullable().optional(),
});

export const TaskPatchSchema = z.object({
  id,
  patch: z.object({
    title: z.string().trim().min(1).max(LIMITS.taskTitle).optional(),
    notes: z.string().max(LIMITS.taskNotes).optional(),
    priority: z.union([z.literal(0), z.literal(1)]).optional(),
    dueAt: z.number().int().nullable().optional(),
  }),
});

export const TaskFilterSchema = z.enum(['pending', 'done', 'all']);
export const IdSchema = id;

export const AlarmInputSchema = z
  .object({
    label: z.string().trim().max(LIMITS.alarmLabel).optional(),
    time: z.string().regex(HHMM_PATTERN).optional(),
    inMinutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional(),
    repeatDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  })
  .refine((v) => (v.time ? 1 : 0) + (v.inMinutes ? 1 : 0) === 1, 'Provide either time or inMinutes');

export const AlarmToggleSchema = z.object({ id, enabled: z.boolean() });
export const AlarmSnoozeSchema = z.object({ id, minutes: z.number().int().min(1).max(60) });

export const ProviderSchema = z.enum(['groq', 'gemini', 'openai', 'anthropic']);
export const SecretSetSchema = z.object({ provider: ProviderSchema, key: z.string().trim().min(8).max(300) });

export const AgentRunSchema = z.object({ text: z.string().trim().min(1).max(LIMITS.chatText) });

export const TtsRequestSchema = z.object({ text: z.string().trim().min(1).max(LIMITS.ttsText) });

export const VoiceSnapshotSchema = z.object({
  state: z.enum(['idle', 'listening', 'thinking', 'speaking']),
  userText: z.string().max(LIMITS.chatText),
  replyText: z.string().max(4000),
  notice: z.string().max(500),
  actions: z.array(z.object({ ok: z.boolean(), summary: z.string().max(200) })).max(10),
});

export const DiagnosticSchema = z.string().max(2000);

export const ScreenshotRequestSchema = z.object({
  taskId: id.optional(),
  title: z.string().trim().min(1).max(LIMITS.taskTitle).optional(),
  note: z.string().trim().max(LIMITS.taskNotes).optional(),
});

export const AttachmentRemoveSchema = z.object({ taskId: id, attachmentId: id });

export const ScreenshotFileSchema = z.string().regex(SHOT_FILE_PATTERN);

export const ReportDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
