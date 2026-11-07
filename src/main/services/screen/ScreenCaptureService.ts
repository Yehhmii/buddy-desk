import { desktopCapturer, screen, systemPreferences } from 'electron';
import { UserFacingError } from '../../core/errors';

export interface ScreenShot {
  png: Buffer;
  width: number;
  height: number;
}

const MAX_WIDTH = 3840;

/**
 * Captures the display under the mouse cursor. This runs only when asked, never in the background.
 * Windows of this app are excluded automatically while content protection is on.
 */
export class ScreenCaptureService {
  async capture(): Promise<ScreenShot> {
    if (process.platform === 'darwin') {
      const access = systemPreferences.getMediaAccessStatus('screen');
      if (access === 'denied' || access === 'restricted') {
        throw new UserFacingError(
          'Allow Screen Recording for Jarvis Desk in System Settings > Privacy & Security > Screen Recording, then restart the app.',
        );
      }
    }
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const scale = Math.min(1, MAX_WIDTH / (display.size.width * display.scaleFactor));
    const width = Math.round(display.size.width * display.scaleFactor * scale);
    const height = Math.round(display.size.height * display.scaleFactor * scale);

    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });
    const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
    if (!source || source.thumbnail.isEmpty()) throw new Error('Screen capture returned nothing');

    const size = source.thumbnail.getSize();
    return { png: source.thumbnail.toPNG(), width: size.width, height: size.height };
  }
}
