import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { ZodType } from 'zod';
import type { InvokeChannel, IpcResult } from '@shared/ipc';
import { toUserMessage } from '../core/errors';
import { logger } from '../core/logger';
import { isTrustedSender } from '../app/security';

/**
 * Registers a validated, sender-checked handler. Every channel takes at most one argument,
 * which is parsed with zod before it reaches any service.
 */
export function handle<TIn, TOut>(
  channel: InvokeChannel,
  schema: ZodType<TIn> | null,
  fn: (input: TIn, event: IpcMainInvokeEvent) => Promise<TOut> | TOut,
): void {
  ipcMain.handle(channel, async (event, raw: unknown): Promise<IpcResult<TOut>> => {
    if (!isTrustedSender(event)) {
      logger.warn(`Blocked IPC from untrusted sender on ${channel}`);
      return { ok: false, error: 'Request refused.' };
    }
    try {
      const input = schema ? schema.parse(raw) : (undefined as TIn);
      return { ok: true, data: await fn(input, event) };
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        logger.warn(`Invalid input on ${channel}`);
        return { ok: false, error: 'Invalid request.' };
      }
      if (error instanceof Error && error.name !== 'UserFacingError' && error.name !== 'NotFoundError') {
        logger.error(`IPC ${channel} failed`, error);
      }
      return { ok: false, error: toUserMessage(error) };
    }
  });
}
