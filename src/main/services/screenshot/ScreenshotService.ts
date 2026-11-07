import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { formatClockTime } from '@shared/time';
import { SHOT_FILE_PATTERN } from '@shared/constants';
import type { Task } from '@shared/types';
import { paths } from '../../config/paths';
import { logger } from '../../core/logger';
import type { ScreenCaptureService } from '../screen/ScreenCaptureService';
import type { TaskService } from '../tasks/TaskService';

export interface ShotRequest {
  taskId?: number;
  title?: string;
  note?: string;
}

/**
 * Saves a picture of the screen and attaches it to a task. This keeps the image itself, it does
 * not read the text in it (that is the OCR path) and it never uploads anything.
 */
export class ScreenshotService {
  constructor(
    private readonly capture: ScreenCaptureService,
    private readonly tasks: TaskService,
    /** Makes this app's own windows invisible for a moment. Returns a function that brings them back. */
    private readonly conceal: () => Promise<() => void>,
    private readonly clock: () => number = Date.now,
  ) {}

  async take(request: ShotRequest): Promise<Task> {
    const restore = await this.conceal();
    let png: Buffer;
    try {
      png = (await this.capture.capture()).png;
    } finally {
      restore();
    }

    const dir = paths.screenshots();
    await mkdir(dir, { recursive: true });
    const stamp = new Date(this.clock()).toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const file = `shot-${stamp}-${randomBytes(3).toString('hex')}.png`;
    await writeFile(join(dir, file), png);

    try {
      const taskId =
        request.taskId ??
        this.tasks.create({ title: request.title ?? `Screenshot, ${formatClockTime(this.clock())}` }).id;
      let task = this.tasks.addAttachment(taskId, file);
      if (request.note) task = this.tasks.appendNote(taskId, request.note);
      return task;
    } catch (error) {
      await unlink(join(dir, file)).catch(() => undefined);
      throw error;
    }
  }

  async remove(taskId: number, attachmentId: number): Promise<Task> {
    const { task, file } = this.tasks.removeAttachment(taskId, attachmentId);
    if (file && SHOT_FILE_PATTERN.test(file)) {
      await unlink(join(paths.screenshots(), file)).catch((error: unknown) =>
        logger.warn('Could not delete screenshot file', error),
      );
    }
    return task;
  }

  filePath(file: string): string | null {
    return SHOT_FILE_PATTERN.test(file) ? join(paths.screenshots(), file) : null;
  }
}
