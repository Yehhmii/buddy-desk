import { normalizeWakePhrase } from './wakeWord';

const NO = [
  'no',
  'nope',
  'nah',
  'not now',
  'not really',
  'later',
  'maybe later',
  'skip',
  'skip it',
  'dont',
  'do not',
  'no thanks',
  'no thank you',
  'not today',
  'leave it',
  'never mind',
  'stop',
  'cancel',
];
const YES = [
  'yes',
  'yeah',
  'yep',
  'yup',
  'sure',
  'please',
  'go ahead',
  'read it',
  'read',
  'read it out',
  'okay',
  'ok',
  'absolutely',
  'of course',
  'do it',
  'why not',
  'go on',
  'sounds good',
  'yes please',
];

const has = (spoken: string, phrase: string): boolean => ` ${spoken} `.includes(` ${phrase} `);

/**
 * Understands a short spoken answer to a yes/no question. "No" wins over "yes" when both appear
 * ("no thanks please"), and anything unclear is null so the caller can decide what to do.
 */
export function parseYesNo(text: string): 'yes' | 'no' | null {
  const spoken = normalizeWakePhrase(text);
  if (!spoken || spoken.split(' ').length > 8) return null;
  if (NO.some((p) => has(spoken, normalizeWakePhrase(p)))) return 'no';
  if (YES.some((p) => has(spoken, normalizeWakePhrase(p)))) return 'yes';
  return null;
}
