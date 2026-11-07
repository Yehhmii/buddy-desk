import type { VoiceSnapshot } from './types';

/**
 * What the floating window is allowed to display. When text is hidden, only the character and its
 * state (listening, thinking, speaking) get through: no words you said, no reply, no task names.
 * This runs in the main process, so hidden text never reaches the overlay window at all.
 */
export function sanitizeSnapshot(snapshot: VoiceSnapshot, showText: boolean): VoiceSnapshot {
  if (showText) return snapshot;
  return {
    state: snapshot.state,
    userText: '',
    replyText: '',
    // A failure still needs to be noticed, just without details that might be sensitive.
    notice: snapshot.notice ? 'Open Jarvis to see what needs attention.' : '',
    actions: [],
  };
}
