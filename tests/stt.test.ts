import { describe, expect, it } from 'vitest';
import { isPhantomTranscript } from '@shared/stt';

describe('isPhantomTranscript', () => {
  it('detects common Whisper hallucinations on silent or near-silent audio', () => {
    // The exact problem reported by the user:
    expect(isPhantomTranscript('Thank you.')).toBe(true);
    expect(isPhantomTranscript('Thank you')).toBe(true);
    expect(isPhantomTranscript('Thank you!')).toBe(true);
    expect(isPhantomTranscript('Thank you...')).toBe(true);
    expect(isPhantomTranscript('Thank you very much.')).toBe(true);
    expect(isPhantomTranscript('Thanks for watching!')).toBe(true);
    expect(isPhantomTranscript('Thanks for watching.')).toBe(true);
    expect(isPhantomTranscript('You.')).toBe(true);
    expect(isPhantomTranscript('.')).toBe(true);
    expect(isPhantomTranscript('')).toBe(true);
    expect(isPhantomTranscript('   ')).toBe(true);
    expect(isPhantomTranscript('[Music]')).toBe(true);
    expect(isPhantomTranscript('(silence)')).toBe(true);
  });

  it('preserves genuine user spoken commands and end phrases', () => {
    expect(isPhantomTranscript('add milk to my tasks')).toBe(false);
    expect(isPhantomTranscript('what is on my calendar')).toBe(false);
    expect(isPhantomTranscript('set an alarm for 7 am')).toBe(false);
    expect(isPhantomTranscript('goodbye')).toBe(false);
    expect(isPhantomTranscript('bye')).toBe(false);
    expect(isPhantomTranscript('thank you for doing that, now list my tasks')).toBe(false);
  });
});
