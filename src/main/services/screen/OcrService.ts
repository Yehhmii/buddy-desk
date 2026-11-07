import { mkdirSync } from 'node:fs';
import { createWorker, type Worker } from 'tesseract.js';
import { paths } from '../../config/paths';
import { logger } from '../../core/logger';

const IDLE_MS = 5 * 60_000;

/** Local OCR. The worker starts on first use and shuts itself down when idle. */
export class OcrService {
  private worker: Promise<Worker> | null = null;
  private idleTimer: NodeJS.Timeout | null = null;

  async recognize(png: Buffer): Promise<string> {
    const worker = await this.ensureWorker();
    this.touch();
    const { data } = await worker.recognize(png);
    this.touch();
    return data.text
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async dispose(): Promise<void> {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const pending = this.worker;
    this.worker = null;
    if (pending) await (await pending).terminate().catch(() => undefined);
  }

  private ensureWorker(): Promise<Worker> {
    if (!this.worker) {
      mkdirSync(paths.ocrCache(), { recursive: true });
      this.worker = createWorker('eng', 1, { cachePath: paths.ocrCache() }).catch((error: unknown) => {
        this.worker = null;
        logger.error('OCR worker failed to start', error);
        throw new Error(
          'Could not start text recognition. The first run needs an internet connection to fetch language data.',
        );
      });
    }
    return this.worker;
  }

  private touch(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.dispose(), IDLE_MS);
  }
}
