import { encodeWav } from './wav';
import { MIC_SAMPLE_RATE, type MicHub } from './MicHub';

export interface RecordOptions {
  /** Seconds of audio from before now to include (used after a wake word). */
  prerollSeconds: number;
  /** Silence that ends the utterance once speech has started. */
  silenceMs: number;
  maxMs: number;
  /** Give up if nobody speaks within this time. */
  noSpeechMs: number;
  /** Finish early, keeping what was captured so far. */
  signal?: AbortSignal;
}

export interface Recording {
  wav: ArrayBuffer;
  /** The same audio as raw samples, for the offline recognizer. */
  samples: Float32Array;
  heardSpeech: boolean;
  speechMs: number;
}

const WINDOW = MIC_SAMPLE_RATE / 50; // 20 ms analysis windows
const MIN_THRESHOLD = 0.012;
const START_WINDOWS = 3;

const toMs = (samples: number): number => (samples / MIC_SAMPLE_RATE) * 1000;

function rms(chunk: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < chunk.length; i++) sum += (chunk[i] ?? 0) ** 2;
  return Math.sqrt(sum / Math.max(1, chunk.length));
}

/** Records one spoken phrase and stops by itself when the speaker goes quiet. */
export function recordUtterance(mic: MicHub, opts: RecordOptions): Promise<Recording> {
  return new Promise((resolve) => {
    const chunks: Float32Array[] = [];
    let total = 0;
    let floor = 0.004;
    let loudRun = 0;
    let speaking = false;
    let heard = false;
    let speechSamples = 0;
    let silentSamples = 0;
    let leftover = new Float32Array(0);
    let finished = false;

    const finish = (): void => {
      if (finished) return;
      finished = true;
      unsubscribe();
      opts.signal?.removeEventListener('abort', finish);
      const all = new Float32Array(total);
      let offset = 0;
      for (const c of chunks) {
        all.set(c, offset);
        offset += c.length;
      }
      resolve({
        wav: heard ? encodeWav(all, MIC_SAMPLE_RATE) : new ArrayBuffer(0),
        samples: heard ? all : new Float32Array(0),
        heardSpeech: heard,
        speechMs: toMs(speechSamples),
      });
    };

    const analyse = (frame: Float32Array): void => {
      const data = new Float32Array(leftover.length + frame.length);
      data.set(leftover);
      data.set(frame, leftover.length);
      let i = 0;
      for (; i + WINDOW <= data.length; i += WINDOW) {
        const level = rms(data.subarray(i, i + WINDOW));
        const threshold = Math.max(MIN_THRESHOLD, floor * 3);
        const loud = level > threshold;
        if (!speaking) floor = floor * 0.97 + level * 0.03;
        loudRun = loud ? loudRun + 1 : 0;
        if (!speaking && loudRun >= START_WINDOWS) {
          speaking = true;
          heard = true;
        }
        if (loud) {
          speechSamples += WINDOW;
          silentSamples = 0;
        } else if (speaking) {
          silentSamples += WINDOW;
        }
      }
      leftover = data.slice(i);
    };

    const onFrame = (frame: Float32Array): void => {
      chunks.push(frame);
      total += frame.length;
      analyse(frame);
      if (heard && toMs(silentSamples) >= opts.silenceMs) finish();
      else if (toMs(total) >= opts.maxMs) finish();
      else if (!heard && toMs(total) >= opts.noSpeechMs) finish();
    };

    const preroll = opts.prerollSeconds > 0 ? mic.recent(opts.prerollSeconds) : new Float32Array(0);
    if (preroll.length > 0) {
      chunks.push(preroll);
      total += preroll.length;
      analyse(preroll);
      // Pre-roll that already contains speech counts as the start of the utterance.
      if (speechSamples > 0) heard = true;
      silentSamples = 0;
    }

    const unsubscribe = mic.subscribe(onFrame);
    if (opts.signal?.aborted) finish();
    else opts.signal?.addEventListener('abort', finish);
  });
}
