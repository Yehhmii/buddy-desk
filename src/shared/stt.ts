// Whisper and neural STT models tend to invent these on near-silent audio or background noise.
const PHANTOMS = new Set([
  'thank you',
  'thank you so much',
  'thank you very much',
  'thanks',
  'thanks a lot',
  'thanks for watching',
  'thank you for watching',
  'please subscribe',
  'subscribe',
  'subscribe to my channel',
  'like and subscribe',
  'see you next time',
  'see you in the next video',
  'see you soon',
  'you',
  'watching',
  'silence',
  'blank audio',
  'music',
  'applause',
]);

/**
 * True when the transcription is a known phantom hallucination generated on silent or near-silent audio.
 */
export function isPhantomTranscript(text: string): boolean {
  if (!text) return true;
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length < 2 || PHANTOMS.has(cleaned);
}
