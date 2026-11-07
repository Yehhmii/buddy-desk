export const WAKE_PRESETS = ['hey buddy', 'buddy', 'computer', 'hey friday', 'okay assistant'] as const;

export type WakeSensitivity = 'low' | 'medium' | 'high';

const MAX_WORDS = 3;

/** Lowercase, strip punctuation, collapse spaces. Apostrophes are dropped. */
export function normalizeWakePhrase(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidWakePhrase(raw: string): boolean {
  const phrase = normalizeWakePhrase(raw);
  if (phrase.length < 3 || phrase.length > 30) return false;
  const words = phrase.split(' ');
  return words.length <= MAX_WORDS && words.every((w) => w.length >= 2);
}

export interface WakePhraseAdvice {
  level: 'good' | 'warn' | 'error';
  message: string;
}

/** Short, plain feedback shown under the wake word field. */
export function adviseWakePhrase(raw: string): WakePhraseAdvice {
  const phrase = normalizeWakePhrase(raw);
  if (!isValidWakePhrase(raw)) {
    return { level: 'error', message: 'Use 1 to 3 plain English words, letters only.' };
  }
  const letters = phrase.replace(/\s/g, '').length;
  if (letters < 6) {
    return { level: 'warn', message: 'Short phrases trigger by accident. Two words work better.' };
  }
  return { level: 'good', message: 'Looks good. Use the test below to check your voice.' };
}

/** Grammar passed to the Vosk recognizer: only the wake phrase or "unknown". */
export function buildWakeGrammar(raw: string): string {
  return JSON.stringify([normalizeWakePhrase(raw), '[unk]']);
}

export function containsWakePhrase(text: string, rawPhrase: string): boolean {
  const phrase = normalizeWakePhrase(rawPhrase);
  if (!phrase) return false;
  return ` ${normalizeWakePhrase(text)} `.includes(` ${phrase} `);
}

export interface ScoredWord {
  word: string;
  conf?: number;
}

export interface WakeConfidence {
  avg: number;
  min: number;
}

/**
 * Calculates the confidence of the wake phrase within recognizer word results.
 * Returns null if the phrase sequence cannot be identified with scores.
 */
export function evaluateWakeConfidence(
  words: ScoredWord[] | undefined,
  rawPhrase: string,
): WakeConfidence | null {
  if (!words || words.length === 0) return null;
  const targetWords = normalizeWakePhrase(rawPhrase).split(' ').filter(Boolean);
  if (targetWords.length === 0) return null;

  for (let i = 0; i <= words.length - targetWords.length; i++) {
    let match = true;
    const confs: number[] = [];
    for (let j = 0; j < targetWords.length; j++) {
      const w = words[i + j];
      if (!w || normalizeWakePhrase(w.word) !== targetWords[j]) {
        match = false;
        break;
      }
      confs.push(typeof w.conf === 'number' && Number.isFinite(w.conf) ? w.conf : 0);
    }
    if (match) {
      const avg = confs.reduce((a, b) => a + b, 0) / confs.length;
      const min = Math.min(...confs);
      return { avg, min };
    }
  }
  return null;
}

/**
 * Thresholds calibrated for Vosk's acoustic model and grammar decoder.
 * Low: Strict - fewest false triggers.
 * Medium: Balanced - requires solid confidence on each word of the phrase.
 * High: Quick - more sensitive, but still prevents obvious noise hallucination.
 */
export function passesWakeSensitivity(
  conf: WakeConfidence | null,
  sensitivity: WakeSensitivity,
  isSingleWord: boolean,
): boolean {
  if (!conf) return false;
  const thresholds = {
    low: { minAvg: isSingleWord ? 0.88 : 0.85, minWord: 0.70 },
    medium: { minAvg: isSingleWord ? 0.78 : 0.72, minWord: 0.50 },
    high: { minAvg: isSingleWord ? 0.65 : 0.58, minWord: 0.35 },
  }[sensitivity];

  return conf.avg >= thresholds.minAvg && conf.min >= thresholds.minWord;
}

/**
 * Returns what was said after the last occurrence of the wake phrase.
 * If the phrase is not in the transcript, the whole transcript is returned.
 */
export function extractCommandAfterWake(transcript: string, rawPhrase: string): string {
  const phrase = normalizeWakePhrase(rawPhrase);
  const words = transcript.trim().split(/\s+/);
  const phraseWords = phrase.split(' ');
  for (let i = words.length - phraseWords.length; i >= 0; i--) {
    const slice = words.slice(i, i + phraseWords.length).map((w) => normalizeWakePhrase(w));
    if (slice.join(' ') === phrase) {
      return words
        .slice(i + phraseWords.length)
        .join(' ')
        .replace(/^[,.:;!?\s-]+/, '')
        .trim();
    }
  }
  return transcript.trim();
}

/** Phrases that always end a conversation, in addition to the one chosen in Settings. */
const BUILT_IN_END_PHRASES = [
  'goodbye',
  'good bye',
  'bye',
  'bye bye',
  'thats all',
  'that will be all',
  'end conversation',
  'end chat',
  'stop listening',
  'go to sleep',
  'we are done',
  'were done',
].map(normalizeWakePhrase);

const MAX_END_WORDS = 8;

/**
 * True when the utterance is an instruction to stop talking. The phrase must open or close a
 * short sentence, so "add a reminder to say goodbye to Sam" does not end the conversation.
 */
export function isEndPhrase(text: string, customPhrase: string): boolean {
  const spoken = normalizeWakePhrase(text);
  if (!spoken || spoken.split(' ').length > MAX_END_WORDS) return false;
  const phrases = [...BUILT_IN_END_PHRASES, normalizeWakePhrase(customPhrase)].filter(Boolean);
  const padded = ` ${spoken} `;
  return phrases.some((p) => padded.startsWith(` ${p} `) || padded.endsWith(` ${p} `));
}

/**
 * Picks an opening statement when the user says the wake word and pauses.
 * Randomly selects between "Uhhh", "Yes <name>", and "Yes".
 */
export function pickWakeGreeting(rawName?: string, randomFn: () => number = Math.random): string {
  const name = rawName?.trim();
  const options = [
    'Uhhh?',
    name ? `Yes, ${name}` : 'Yes?',
    'Yes?',
    'Mm-hmm?',
  ];
  const index = Math.min(options.length - 1, Math.max(0, Math.floor(randomFn() * options.length)));
  return options[index] ?? 'Yes';
}

