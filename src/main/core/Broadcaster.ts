import { BrowserWindow } from 'electron';
import type { EventName, EventPayloads } from '@shared/ipc';

/** What services see. They never import Electron windows directly. */
export interface Broadcaster {
  emit<E extends EventName>(event: E, payload: EventPayloads[E]): void;
}

export class WindowBroadcaster implements Broadcaster {
  emit<E extends EventName>(event: E, payload: EventPayloads[E]): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && !win.webContents.isDestroyed()) win.webContents.send(event, payload);
    }
  }
}
