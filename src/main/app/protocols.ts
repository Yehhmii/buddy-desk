import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { net, protocol } from 'electron';
import { join } from 'node:path';
import { MODEL_PROTOCOL, SHOTS_PROTOCOL, SHOT_FILE_PATTERN } from '@shared/constants';
import { paths } from '../config/paths';
import type { WakeModelService } from '../services/wake/WakeModelService';

/** Serves the downloaded wake-word model to the renderer. Exactly one file, nothing else. */
export function registerModelProtocol(models: WakeModelService): void {
  protocol.handle(MODEL_PROTOCOL, async (request) => {
    const url = new URL(request.url);
    const file = models.filePath();
    if (url.host !== 'vosk' || url.pathname !== '/model.tar.gz' || !existsSync(file)) {
      return new Response('Not found', { status: 404 });
    }
    const upstream = await net.fetch(pathToFileURL(file).toString());
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': 'application/gzip',
        'access-control-allow-origin': '*',
        'cache-control': 'no-store',
      },
    });
  });
}

/** Serves saved screenshots to the UI. Only files whose names match our own pattern are reachable. */
export function registerShotsProtocol(): void {
  protocol.handle(SHOTS_PROTOCOL, async (request) => {
    const url = new URL(request.url);
    const file = decodeURIComponent(url.pathname.replace(/^\//, ''));
    const full = join(paths.screenshots(), file);
    if (url.host !== 'img' || !SHOT_FILE_PATTERN.test(file) || !existsSync(full)) {
      return new Response('Not found', { status: 404 });
    }
    const upstream = await net.fetch(pathToFileURL(full).toString());
    return new Response(upstream.body, {
      status: 200,
      headers: { 'content-type': 'image/png', 'cache-control': 'private, max-age=86400' },
    });
  });
}
