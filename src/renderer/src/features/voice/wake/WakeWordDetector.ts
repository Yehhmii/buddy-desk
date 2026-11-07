import { createModel, type KaldiRecognizer, type Model } from 'vosk-browser';
import { WAKE_MODEL_URL } from '@shared/constants';
import {
  buildWakeGrammar,
  containsWakePhrase,
  evaluateWakeConfidence,
  normalizeWakePhrase,
  passesWakeSensitivity,
  type WakeSensitivity,
} from '@shared/wakeWord';
import { MIC_SAMPLE_RATE, type MicHub } from '../audio/MicHub';

export interface WakeStartOptions {
  phrase: string;
  sensitivity: WakeSensitivity;
  onDetect: () => void;
  /** Called with whatever the recognizer thinks it heard. Used by the test panel. */
  onHeard?: (text: string) => void;
}

const COOLDOWN_MS = 2500;
const MODEL_LOAD_TIMEOUT_MS = 120_000;

/**
 * Offline wake word using Vosk with a tiny grammar: the recognizer can only answer with the
 * wake phrase or "unknown", which keeps CPU low and makes any phrase customizable.
 */
export class WakeWordDetector {
  private model: Model | null = null;
  private loading: Promise<Model> | null = null;
  private recognizer: KaldiRecognizer | null = null;
  private unsubscribe: (() => void) | null = null;
  private lastFire = 0;

  constructor(private readonly mic: MicHub) {}

  isRunning(): boolean {
    return this.recognizer !== null;
  }

  async start(opts: WakeStartOptions): Promise<void> {
    this.stop();
    const model = await this.loadModel();
    const recognizer = new model.KaldiRecognizer(MIC_SAMPLE_RATE, buildWakeGrammar(opts.phrase));
    recognizer.setWords(true);

    const isSingleWord = normalizeWakePhrase(opts.phrase).split(' ').filter(Boolean).length <= 1;

    const fire = (): void => {
      const now = Date.now();
      if (now - this.lastFire < COOLDOWN_MS) return;
      this.lastFire = now;
      opts.onDetect();
    };

    recognizer.on('partialresult', (msg) => {
      if (msg.event !== 'partialresult') return;
      const text = msg.result.partial;
      if (text) opts.onHeard?.(text);
      // High sensitivity can fire early on partial results for multi-word phrases when voice level is audible
      if (
        opts.sensitivity === 'high' &&
        !isSingleWord &&
        this.mic.level() > 0.03 &&
        containsWakePhrase(text, opts.phrase)
      ) {
        fire();
      }
    });

    recognizer.on('result', (msg) => {
      if (msg.event !== 'result') return;
      const { text, result: words } = msg.result;
      if (text) opts.onHeard?.(text);
      if (!containsWakePhrase(text, opts.phrase)) return;

      const conf = evaluateWakeConfidence(words, opts.phrase);
      if (!passesWakeSensitivity(conf, opts.sensitivity, isSingleWord)) return;

      fire();
    });

    this.recognizer = recognizer;
    this.unsubscribe = this.mic.subscribe((frame) => recognizer.acceptWaveformFloat(frame, MIC_SAMPLE_RATE));
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.recognizer?.remove();
    this.recognizer = null;
  }

  /**
   * Basic offline speech-to-text using the same model, with no phrase restriction. Less accurate than a
   * cloud service, but free, private, and it needs no key. Used when no cloud speech service is set up.
   */
  async transcribe(samples: Float32Array): Promise<string> {
    const model = await this.loadModel();
    const recognizer = new model.KaldiRecognizer(MIC_SAMPLE_RATE);
    const parts: string[] = [];
    return new Promise<string>((resolve, reject) => {
      let settle: ReturnType<typeof setTimeout> | null = null;
      const finish = (): void => {
        clearTimeout(cap);
        if (settle) clearTimeout(settle);
        recognizer.remove();
        resolve(parts.join(' ').trim());
      };
      const cap = setTimeout(() => {
        recognizer.remove();
        reject(new Error('Offline speech recognition took too long.'));
      }, 30_000);
      recognizer.on('result', (msg) => {
        if (msg.event !== 'result') return;
        if (msg.result.text) parts.push(msg.result.text);
        // Results arrive in order and the final one comes last; a short quiet gap means we have them all.
        if (settle) clearTimeout(settle);
        settle = setTimeout(finish, 700);
      });
      recognizer.on('error', () => {
        clearTimeout(cap);
        reject(new Error('Offline speech recognition failed.'));
      });
      recognizer.acceptWaveformFloat(samples, MIC_SAMPLE_RATE);
      recognizer.retrieveFinalResult();
    });
  }

  dispose(): void {
    this.stop();
    this.model?.terminate();
    this.model = null;
    this.loading = null;
  }

  private loadModel(): Promise<Model> {
    if (this.model) return Promise.resolve(this.model);
    this.loading ??= Promise.race([
      createModel(WAKE_MODEL_URL),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error('The wake word model took too long to load. Try again, or restart the app.')),
          MODEL_LOAD_TIMEOUT_MS,
        ),
      ),
    ]).then(
      (m) => (this.model = m),
      (error: unknown) => {
        this.loading = null;
        throw error instanceof Error ? error : new Error('The wake word model could not be loaded.');
      },
    );
    return this.loading;
  }
}
