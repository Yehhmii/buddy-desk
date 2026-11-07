import { describe, expect, it } from 'vitest';
import {
  adviseWakePhrase,
  buildWakeGrammar,
  containsWakePhrase,
  evaluateWakeConfidence,
  extractCommandAfterWake,
  isValidWakePhrase,
  normalizeWakePhrase,
  passesWakeSensitivity,
  pickWakeGreeting,
} from '@shared/wakeWord';
import { isValidAccelerator } from '@shared/hotkey';

describe('wake phrase', () => {
  it('normalizes punctuation and case', () => {
    expect(normalizeWakePhrase('  Hey,  BUDDY! ')).toBe('hey buddy');
  });

  it('validates length and word count', () => {
    expect(isValidWakePhrase('hey buddy')).toBe(true);
    expect(isValidWakePhrase('ok')).toBe(false);
    expect(isValidWakePhrase('one two three four')).toBe(false);
    expect(isValidWakePhrase('h3y j4rvis')).toBe(false); // digits are not allowed
    expect(isValidWakePhrase('123')).toBe(false);
  });

  it('warns about short phrases', () => {
    expect(adviseWakePhrase('max').level).toBe('warn');
    expect(adviseWakePhrase('hey buddy').level).toBe('good');
    expect(adviseWakePhrase('x').level).toBe('error');
  });

  it('builds a grammar with unknown fallback', () => {
    expect(JSON.parse(buildWakeGrammar('Hey Jarvis'))).toEqual(['hey buddy', '[unk]']);
  });

  it('matches whole words only', () => {
    expect(containsWakePhrase('well hey buddy there', 'hey buddy')).toBe(true);
    expect(containsWakePhrase('hey buddyx', 'hey buddy')).toBe(false);
  });

  it('extracts the command after the last wake phrase', () => {
    expect(extractCommandAfterWake('Hey Jarvis, add milk to my tasks.', 'hey buddy')).toBe(
      'add milk to my tasks.',
    );
    expect(extractCommandAfterWake('blah blah hey buddy hey buddy what is pending', 'hey buddy')).toBe(
      'what is pending',
    );
    expect(extractCommandAfterWake('Hey Jarvis', 'hey buddy')).toBe('');
    expect(extractCommandAfterWake('add milk', 'hey buddy')).toBe('add milk');
  });

  it('evaluates wake confidence and rejects false positives', () => {
    const clearHit = [
      { word: 'hey', conf: 0.95 },
      { word: 'buddy', conf: 0.88 },
    ];
    const conf = evaluateWakeConfidence(clearHit, 'hey buddy');
    expect(conf).not.toBeNull();
    expect(conf?.avg).toBeCloseTo(0.915);
    expect(passesWakeSensitivity(conf, 'medium', false)).toBe(true);
    expect(passesWakeSensitivity(conf, 'low', false)).toBe(true);

    const noiseHit = [
      { word: 'hey', conf: 0.35 },
      { word: 'buddy', conf: 0.28 },
    ];
    const noiseConf = evaluateWakeConfidence(noiseHit, 'hey buddy');
    expect(noiseConf).not.toBeNull();
    expect(passesWakeSensitivity(noiseConf, 'medium', false)).toBe(false);
    expect(passesWakeSensitivity(noiseConf, 'low', false)).toBe(false);
    expect(passesWakeSensitivity(noiseConf, 'high', false)).toBe(false);

    // Mismatched / empty words
    expect(evaluateWakeConfidence([], 'hey buddy')).toBeNull();
    expect(evaluateWakeConfidence([{ word: 'something', conf: 0.9 }], 'hey buddy')).toBeNull();
    expect(passesWakeSensitivity(null, 'medium', false)).toBe(false);
  });

  it('randomly picks among opening wake statements', () => {
    expect(pickWakeGreeting('Francisco', () => 0.1)).toBe('Uhhh');
    expect(pickWakeGreeting('Francisco', () => 0.4)).toBe('Yes, Francisco');
    expect(pickWakeGreeting('Francisco', () => 0.8)).toBe('Yes');
    expect(pickWakeGreeting('', () => 0.4)).toBe('Yes');
    expect(pickWakeGreeting(undefined, () => 0.4)).toBe('Yes');
  });
});

describe('accelerator', () => {
  it('accepts valid and rejects invalid shortcuts', () => {
    expect(isValidAccelerator('Control+Shift+J')).toBe(true);
    expect(isValidAccelerator('Alt+Space')).toBe(true);
    expect(isValidAccelerator('J')).toBe(false);
    expect(isValidAccelerator('Control+Control+J')).toBe(false);
    expect(isValidAccelerator('Control+Shift')).toBe(false);
  });
});
