import { app, session, shell, systemPreferences, type IpcMainInvokeEvent, type WebContents } from 'electron';
import { MODEL_PROTOCOL, SHOTS_PROTOCOL } from '@shared/constants';
import { logger } from '../core/logger';

const DEV_URL = process.env['ELECTRON_RENDERER_URL'];

function isAppUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (DEV_URL && u.origin === new URL(DEV_URL).origin) return true;
    return (
      u.protocol === 'file:' &&
      (u.pathname.endsWith('/renderer/index.html') || u.pathname.endsWith('/renderer/overlay.html'))
    );
  } catch {
    return false;
  }
}

/** Only our own page may call IPC. Anything else (an injected frame, a navigated page) is refused. */
export function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  return isAppUrl(event.senderFrame?.url ?? '');
}

function lockDownContents(contents: WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
}

export function hardenApp(): void {
  app.on('web-contents-created', (_event, contents) => lockDownContents(contents));

  const ses = session.defaultSession;
  // Microphone only, and only for our own page. Camera, notifications, geolocation etc. are refused.
  ses.setPermissionRequestHandler((contents, permission, callback, details) => {
    const allowed = permission === 'media' && isAppUrl(details.requestingUrl ?? contents.getURL());
    if (!allowed) {
      logger.warn(`Denied permission request: ${permission}`);
      return callback(false);
    }
    if (process.platform !== 'darwin') return callback(true);
    // macOS asks the person itself; Electron only learns the answer.
    void systemPreferences.askForMediaAccess('microphone').then(callback, () => callback(false));
  });
  ses.setPermissionCheckHandler(
    (contents, permission, origin) => permission === 'media' && isAppUrl(contents?.getURL() || origin),
  );
  ses.setDisplayMediaRequestHandler((_request, callback) => callback({}));
}

export const SHOTS_SCHEME = {
  scheme: SHOTS_PROTOCOL,
  privileges: { standard: true, secure: true, supportFetchAPI: true },
} as const;

export const MODEL_SCHEME = {
  scheme: MODEL_PROTOCOL,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
} as const;
