import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { TtsResult } from '@shared/types';
import { logger } from '../../core/logger';
import type { SettingsService } from '../settings/SettingsService';

const TIMEOUT_MS = 15_000;

/** Free neural voices through the Edge read-aloud service. Failure is non-fatal: the UI falls back to system voices. */
export class TtsService {
  constructor(private readonly settings: SettingsService) {}

  async synthesize(text: string): Promise<TtsResult> {
    const { voiceName, speechRate } = this.settings.get().voice;
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const rate = `${speechRate >= 0 ? '+' : ''}${speechRate}%`;
      const { audioStream } = tts.toStream(text, { rate });

      const chunks: Buffer[] = [];
      const collect = (async () => {
        for await (const chunk of audioStream) chunks.push(Buffer.from(chunk as Buffer));
      })();
      await Promise.race([
        collect,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TTS timed out')), TIMEOUT_MS)),
      ]);

      const audio = Buffer.concat(chunks);
      if (audio.length === 0) throw new Error('TTS returned no audio');
      const copy = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
      return { audio: copy, mime: 'audio/mpeg' };
    } catch (error) {
      logger.warn('Edge TTS failed, renderer will use system voice', error);
      return { audio: null, mime: 'audio/mpeg' };
    } finally {
      tts.close();
    }
  }
}
