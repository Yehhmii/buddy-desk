import type { ScreenStatus } from '@shared/types';
import type { SettingsService } from '../settings/SettingsService';
import type { Broadcaster } from '../../core/Broadcaster';
import type { OcrService } from './OcrService';
import type { ScreenCaptureService } from './ScreenCaptureService';
import { redactSensitiveText } from './redact';

const MAX_CHARS = 8000;
const TTL_MS = 3 * 60_000;

export interface ScreenSnapshot {
  text: string;
  capturedAt: number;
  /** data: URL, only present when the caller asked for the image. */
  imageDataUrl?: string;
}

/**
 * One shared place where "what is on my screen" lives. The OCR text can be attached to the
 * next assistant turns (button in the UI) or pulled on demand by the voice agent.
 */
export class ScreenContextService {
  private attached: ScreenSnapshot | null = null;

  constructor(
    private readonly capture: ScreenCaptureService,
    private readonly ocr: OcrService,
    private readonly settings: SettingsService,
    private readonly broadcaster: Broadcaster,
    private readonly clock: () => number = Date.now,
  ) {}

  async snapshot(options: { withImage?: boolean } = {}): Promise<ScreenSnapshot> {
    const shot = await this.capture.capture();
    const raw = await this.ocr.recognize(shot.png);
    const { redactSensitiveText: shouldRedact, allowVisionUpload } = this.settings.get().privacy;
    const cleaned = shouldRedact ? redactSensitiveText(raw) : raw;
    const text = cleaned.length > MAX_CHARS ? `${cleaned.slice(0, MAX_CHARS)}\n[truncated]` : cleaned;
    const snap: ScreenSnapshot = { text, capturedAt: this.clock() };
    if (options.withImage && allowVisionUpload) {
      snap.imageDataUrl = `data:image/png;base64,${shot.png.toString('base64')}`;
    }
    return snap;
  }

  async attach(): Promise<ScreenStatus> {
    this.attached = await this.snapshot();
    return this.publish();
  }

  clear(): ScreenStatus {
    this.attached = null;
    return this.publish();
  }

  /** Text for the system prompt, or null when nothing is attached or it has gone stale. */
  attachedText(): string | null {
    if (!this.attached) return null;
    if (this.clock() - this.attached.capturedAt > TTL_MS) {
      this.attached = null;
      this.publish();
      return null;
    }
    return this.attached.text;
  }

  status(): ScreenStatus {
    const text = this.attachedText();
    return {
      attached: text !== null,
      chars: text?.length ?? 0,
      capturedAt: text !== null ? (this.attached?.capturedAt ?? null) : null,
    };
  }

  private publish(): ScreenStatus {
    const status = this.status();
    this.broadcaster.emit('screen:changed', status);
    return status;
  }
}
