import { z } from 'zod';
import type { ToolSpec } from './types';

const ref = z
  .union([z.string().min(1).max(200), z.number().int()])
  .describe('The id (like 12) or a few words from the title');

const due = z
  .string()
  .max(40)
  .describe('Local date-time like 2026-11-04T15:00, or just a date like 2026-11-04. Use "none" to clear.');

const priority = z.enum(['normal', 'high']);

export const TOOL_DEFS = {
  add_task: {
    description: 'Add a new task to the pending list.',
    schema: z.object({
      title: z.string().min(1).max(200),
      notes: z.string().max(2000).optional(),
      priority: priority.optional(),
      due: due.optional(),
    }),
  },
  complete_task: {
    description: 'Mark a pending task as done.',
    schema: z.object({ ref }),
  },
  reopen_task: {
    description: 'Move a finished task back to pending.',
    schema: z.object({ ref }),
  },
  remove_task: {
    description: 'Delete a single task. Never use this to clear many tasks at once.',
    schema: z.object({ ref }),
  },
  edit_task: {
    description: 'Change the title, notes, priority or due date of a task.',
    schema: z.object({
      ref,
      title: z.string().min(1).max(200).optional(),
      notes: z.string().max(2000).optional(),
      priority: priority.optional(),
      due: due.optional(),
    }),
  },
  list_tasks: {
    description: 'List tasks. Use when the user asks what is pending or what they finished.',
    schema: z.object({ filter: z.enum(['pending', 'done', 'all']) }),
  },
  set_alarm: {
    description:
      'Create an alarm at a clock time, or a countdown timer. Provide exactly one of time or in_minutes.',
    schema: z.object({
      label: z.string().max(80).optional(),
      time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional()
        .describe('24-hour HH:MM, local time'),
      in_minutes: z.number().int().min(1).max(1440).optional(),
      repeat_days: z
        .array(z.number().int().min(0).max(6))
        .optional()
        .describe('0 is Sunday ... 6 is Saturday. Omit for one-off.'),
    }),
  },
  cancel_alarm: {
    description: 'Delete an alarm or timer.',
    schema: z.object({ ref }),
  },
  list_alarms: {
    description: 'List the alarms and timers that are set.',
    schema: z.object({}),
  },
  read_screen: {
    description:
      'Capture the screen and read its text with OCR. Set use_vision only when the text is not enough, such as charts, images or layout questions.',
    schema: z.object({ use_vision: z.boolean().optional() }),
  },
  take_screenshot: {
    description:
      'Save a picture of the screen as an image and attach it to a task. This stores the image, it does not read text (use read_screen for that). Give task to attach it to an existing task, or new_task_title to create a task for it. With neither, a new task named after the time is created.',
    schema: z.object({
      task: ref.optional().describe('Existing task to attach the screenshot to'),
      new_task_title: z.string().min(1).max(200).optional(),
      note: z.string().max(2000).optional().describe('A note to save with the screenshot'),
    }),
  },
  show_app: {
    description: 'Open the Jarvis Desk window on screen.',
    schema: z.object({}),
  },
  add_note: {
    description: 'Add a note to a task. The note is appended to any notes already there.',
    schema: z.object({ ref, note: z.string().min(1).max(2000) }),
  },
  make_report: {
    description: "Generate today's end-of-day report.",
    schema: z.object({}),
  },
} as const;

export type ToolName = keyof typeof TOOL_DEFS;

export function isToolName(name: string): name is ToolName {
  return Object.prototype.hasOwnProperty.call(TOOL_DEFS, name);
}

/**
 * Gemini's compatibility layer is picky about JSON Schema extras, and every character is paid for in
 * tokens on each request. Length and range limits are dropped from what the model sees; they are
 * still enforced by zod when a tool runs.
 */
const SCHEMA_NOISE = new Set([
  '$schema',
  'additionalProperties',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
]);
function cleanSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(cleanSchema);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (SCHEMA_NOISE.has(key)) continue;
      out[key] = cleanSchema(value);
    }
    return out;
  }
  return node;
}

export function toolSpecs(): ToolSpec[] {
  return (Object.entries(TOOL_DEFS) as Array<[ToolName, (typeof TOOL_DEFS)[ToolName]]>).map(
    ([name, def]) => ({
      name,
      description: def.description,
      parameters: cleanSchema(z.toJSONSchema(def.schema)) as Record<string, unknown>,
    }),
  );
}
