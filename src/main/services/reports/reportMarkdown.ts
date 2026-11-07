import type { Task } from '@shared/types';

export interface ReportInput {
  dateLabel: string;
  userName: string;
  completed: string[];
  added: string[];
  removed: string[];
  pending: Task[];
  carriedOver: Task[];
  narrative: string;
}

const list = (items: string[], empty: string): string =>
  items.length > 0 ? items.map((t) => `- ${t}`).join('\n') : `_${empty}_`;

/** The lists come from the database, only the short narrative comes from the model. */
export function buildReportMarkdown(input: ReportInput): string {
  const pendingLines = input.pending.map((t) => (t.priority === 1 ? `${t.title} (high priority)` : t.title));
  const carriedIds = new Set(input.carriedOver.map((t) => t.id));
  const carriedLines = input.pending.filter((t) => carriedIds.has(t.id)).map((t) => t.title);

  return [
    `# Day report, ${input.dateLabel}`,
    input.narrative.trim(),
    `## Finished today (${input.completed.length})`,
    list(input.completed, 'Nothing was marked done today.'),
    `## Still open (${input.pending.length})`,
    list(pendingLines, 'Nothing is waiting. Clean slate.'),
    ...(carriedLines.length > 0
      ? [`## Carried over from earlier days (${carriedLines.length})`, list(carriedLines, '')]
      : []),
    ...(input.added.length > 0 ? [`## Added today (${input.added.length})`, list(input.added, '')] : []),
    ...(input.removed.length > 0
      ? [`## Dropped today (${input.removed.length})`, list(input.removed, '')]
      : []),
  ].join('\n\n');
}

/** Used when no AI provider is reachable, so the report still reads like a report. */
export function fallbackNarrative(done: number, open: number): string {
  if (done === 0 && open === 0) return 'No tasks were tracked today.';
  if (done === 0)
    return `Nothing was finished today, and ${open} ${open === 1 ? 'task is' : 'tasks are'} still open.`;
  return `You finished ${done} ${done === 1 ? 'task' : 'tasks'} today. ${open === 0 ? 'Nothing is left open.' : `${open} ${open === 1 ? 'task is' : 'tasks are'} still open.`}`;
}
