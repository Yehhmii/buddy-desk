import { normalizeWakePhrase } from './wakeWord';

const MIN_WORDS = 3;
const MIN_OVERLAP = 0.85;

/**
 * True when what the microphone "heard" is almost certainly Jarvis's own voice coming back out of the
 * speakers. Without this, "Added buy milk to your tasks" can be heard as a new request to add a task.
 */
export function looksLikeEcho(heard: string, spoken: string): boolean {
  const words = normalizeWakePhrase(heard).split(' ').filter(Boolean);
  if (words.length < MIN_WORDS) return false;
  const reference = new Set(normalizeWakePhrase(spoken).split(' ').filter(Boolean));
  if (reference.size === 0) return false;
  return words.filter((w) => reference.has(w)).length / words.length >= MIN_OVERLAP;
}
