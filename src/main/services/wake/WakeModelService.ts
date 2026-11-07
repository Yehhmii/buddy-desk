import { createWriteStream, existsSync, statSync } from 'node:fs';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { WAKE_MODEL_FILE } from '@shared/constants';
import type { WakeModelProgress, WakeModelStatus } from '@shared/types';
import { wakeModelUrlOverride } from '../../config/env';
import { paths } from '../../config/paths';
import { UserFacingError } from '../../core/errors';
import { logger } from '../../core/logger';

const DEFAULT_URL = 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz';
const MIN_BYTES = 20 * 1024 * 1024;
const GZIP_MAGIC = [0x1f, 0x8b];

/** Downloads and stores the offline wake-word model (Vosk small English, about 40 MB). */
export class WakeModelService {
  private downloading = false;

  constructor(private readonly onProgress: (p: WakeModelProgress) => void) {}

  filePath(): string {
    return join(paths.models(), WAKE_MODEL_FILE);
  }

  status(): WakeModelStatus {
    const file = this.filePath();
    const installed = existsSync(file) && statSync(file).size >= MIN_BYTES;
    return { installed, downloading: this.downloading, sizeBytes: installed ? statSync(file).size : 0 };
  }

  async download(): Promise<WakeModelStatus> {
    if (this.downloading) return this.status();
    this.downloading = true;
    const target = this.filePath();
    const partial = `${target}.part`;
    try {
      await mkdir(paths.models(), { recursive: true });
      const res = await fetch(wakeModelUrlOverride() ?? DEFAULT_URL, {
        redirect: 'follow',
        signal: AbortSignal.timeout(10 * 60_000),
      });
      if (!res.ok || !res.body) throw new Error(`Download failed with HTTP ${res.status}`);

      const total = Number(res.headers.get('content-length')) || 0;
      let received = 0;
      const body = Readable.fromWeb(res.body as import('node:stream/web').ReadableStream);
      body.on('data', (chunk: Buffer) => {
        received += chunk.length;
        this.onProgress({ receivedBytes: received, totalBytes: total });
      });
      await pipeline(body, createWriteStream(partial));

      await this.verify(partial);
      await rename(partial, target);
      logger.info('Wake word model installed');
      return this.status();
    } catch (error) {
      await rm(partial, { force: true });
      logger.error('Wake model download failed', error);
      throw new UserFacingError(
        'Could not download the wake word model. Check your connection and try again.',
      );
    } finally {
      this.downloading = false;
    }
  }

  private async verify(file: string): Promise<void> {
    if (statSync(file).size < MIN_BYTES) throw new Error('Downloaded file is too small');
    const handle = await open(file, 'r');
    try {
      const head = Buffer.alloc(2);
      await handle.read(head, 0, 2, 0);
      if (head[0] !== GZIP_MAGIC[0] || head[1] !== GZIP_MAGIC[1])
        throw new Error('Downloaded file is not a gzip archive');
    } finally {
      await handle.close();
    }
  }
}
