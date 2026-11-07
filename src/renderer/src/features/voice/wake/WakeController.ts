import type { WakeSensitivity } from '@shared/wakeWord';
import type { MicHub } from '../audio/MicHub';
import type { WakeWordDetector } from './WakeWordDetector';
import type { WakeRuntime } from '@/stores/useWakeStore';

export interface WakeConfig {
  enabled: boolean;
  phrase: string;
  sensitivity: WakeSensitivity;
  modelInstalled: boolean;
  /** Wake word listening pauses while Jarvis is talking or thinking, so it never hears itself. */
  voiceIdle: boolean;
}

/** Decides when the detector should run and serialises start/stop so they cannot race. */
export class WakeController {
  private config: WakeConfig | null = null;
  private activeKey: string | null = null;
  private holdingMic = false;
  private testing = false;
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly mic: MicHub,
    private readonly detector: WakeWordDetector,
    private readonly onDetect: () => void,
    private readonly onStatus: (runtime: WakeRuntime, error?: string) => void,
  ) {}

  sync(config: WakeConfig): void {
    this.config = config;
    void this.enqueue(() => this.reconcile()).catch(() => undefined);
  }

  /**
   * Runs the detector for the settings test panel. Returns a stop function.
   * Errors (microphone blocked, model failed to load) are thrown to the caller so the panel can show them.
   */
  async test(
    phrase: string,
    sensitivity: WakeSensitivity,
    onHeard: (t: string) => void,
    onHit: () => void,
  ): Promise<() => void> {
    this.testing = true;
    try {
      await this.enqueue(() => this.reconcile());
      await this.enqueue(async () => {
        await this.mic.acquire();
        this.holdingMic = true;
        try {
          await this.detector.start({ phrase, sensitivity, onHeard, onDetect: onHit });
          this.activeKey = 'test';
        } catch (error) {
          this.mic.release();
          this.holdingMic = false;
          throw error;
        }
      });
    } catch (error) {
      this.testing = false;
      void this.enqueue(() => this.reconcile()).catch(() => undefined);
      throw error;
    }
    return () => {
      this.testing = false;
      void this.enqueue(async () => {
        await this.halt();
        await this.reconcile();
      }).catch(() => undefined);
    };
  }

  /** Runs tasks one at a time. The caller still sees the task's error; the queue itself keeps going. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(task);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async reconcile(): Promise<void> {
    const c = this.config;
    if (this.testing) {
      await this.halt();
      return;
    }
    const wanted = Boolean(c?.enabled && c.modelInstalled && c.voiceIdle);
    if (!c || !wanted) {
      await this.halt();
      this.onStatus('off');
      return;
    }
    const key = `${c.phrase}|${c.sensitivity}`;
    if (this.activeKey === key && this.detector.isRunning()) return;

    await this.halt();
    this.onStatus('loading');
    try {
      await this.mic.acquire();
      this.holdingMic = true;
      await this.detector.start({ phrase: c.phrase, sensitivity: c.sensitivity, onDetect: this.onDetect });
      this.activeKey = key;
      this.onStatus('listening');
    } catch (error) {
      if (this.holdingMic) this.mic.release();
      this.holdingMic = false;
      this.onStatus('error', error instanceof Error ? error.message : 'Could not start the wake word');
    }
  }

  private async halt(): Promise<void> {
    this.detector.stop();
    this.activeKey = null;
    if (this.holdingMic) {
      this.mic.release();
      this.holdingMic = false;
    }
  }
}
