import type { Task } from '@shared/types';

export type TaskMatch = { kind: 'one'; task: Task } | { kind: 'many'; tasks: Task[] } | { kind: 'none' };

const STOP_WORDS = new Set(['the', 'a', 'an', 'to', 'my', 'task', 'of', 'for', 'and', 'on', 'in']);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function score(query: string[], title: string[]): number {
  if (query.length === 0 || title.length === 0) return 0;
  let hits = 0;
  for (const q of query) {
    if (
      title.some((t) => t === q || (q.length >= 3 && (t.startsWith(q) || (q.startsWith(t) && t.length >= 3))))
    )
      hits++;
  }
  return hits / query.length;
}

const MIN_SCORE = 0.6;

/**
 * Resolves what the user (or the model) means by "the invoice task".
 * Accepts an id ("12", "#12"), an exact title, or a loose description.
 */
export function resolveTaskRef(ref: string | number, candidates: Task[]): TaskMatch {
  const text = String(ref).trim();
  const idMatch = /^#?(\d+)$/.exec(text);
  if (idMatch) {
    const task = candidates.find((t) => t.id === Number(idMatch[1]));
    if (task) return { kind: 'one', task };
  }

  const lowered = text.toLowerCase();
  const exact = candidates.filter((t) => t.title.toLowerCase() === lowered);
  if (exact.length === 1 && exact[0]) return { kind: 'one', task: exact[0] };

  const q = tokens(text);
  const scored = candidates
    .map((task) => ({ task, score: score(q, tokens(task.title)) }))
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return { kind: 'none' };
  const top = scored.filter((s) => s.score === best.score);
  if (top.length === 1) return { kind: 'one', task: best.task };
  return { kind: 'many', tasks: top.map((s) => s.task).slice(0, 5) };
}
