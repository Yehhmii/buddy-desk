import type { TranscribeResult } from '@shared/types';
import { UserFacingError } from '../../core/errors';
import { logger } from '../../core/logger';
import type { SecretsService } from '../secrets/SecretsService';
import type { SettingsService } from '../settings/SettingsService';

import { isPhantomTranscript } from '@shared/stt';
export { isPhantomTranscript };

const VOCAB_HINT =
  'Jarvis, task, tasks, alarm, timer, remind me, add, remove, complete, report, screen, screenshot.';

function looksLikeWav(buf: Buffer): boolean {
  return buf.length > 44 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE';
}

type Engine = { name: string; run: (wav: Buffer, hint: string) => Promise<string> };

function failure(name: string, status: number): UserFacingError {
  if (status === 429)
    return new UserFacingError(`${name} speech recognition is rate limited. Wait a moment and try again.`);
  if (status === 401 || status === 403)
    return new UserFacingError(`${name} rejected the API key. Check it in Settings.`);
  return new UserFacingError(`${name} speech recognition failed (${status}).`);
}

async function multipart(
  url: string,
  key: string,
  model: string,
  wav: Buffer,
  hint: string,
  name: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'speech.wav');
  form.append('model', model);
  form.append('response_format', 'json');
  form.append('language', 'en');
  form.append('prompt', hint);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw failure(name, res.status);
  return (((await res.json()) as { text?: string }).text ?? '').trim();
}

/**
 * Turns recorded speech into text using whichever cloud speech service has a key: Groq (free), then
 * OpenAI, then Gemini. If none has a key it answers null and the app falls back to the offline engine.
 * Claude has no speech-to-text service, so Claude-only users rely on one of the others or the offline engine.
 */
export class SttService {
  constructor(
    private readonly secrets: SecretsService,
    private readonly settings: SettingsService,
  ) {}

  private engines(): Engine[] {
    const ai = this.settings.get().ai;
    const list: Engine[] = [];
    const groq = this.secrets.get('groq');
    const openai = this.secrets.get('openai');
    const gemini = this.secrets.get('gemini');
    if (groq)
      list.push({
        name: 'Groq',
        run: (w, h) =>
          multipart('https://api.groq.com/openai/v1/audio/transcriptions', groq, ai.sttModel, w, h, 'Groq'),
      });
    if (openai)
      list.push({
        name: 'OpenAI',
        run: (w, h) =>
          multipart(
            'https://api.openai.com/v1/audio/transcriptions',
            openai,
            ai.openaiSttModel,
            w,
            h,
            'OpenAI',
          ),
      });
    if (gemini) {
      list.push({
        name: 'Gemini',
        run: async (wav) => {
          const res = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gemini}` },
              body: JSON.stringify({
                model: ai.geminiModel,
                max_tokens: 300,
                messages: [
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: 'Transcribe this audio exactly as spoken. Reply with only the transcript. If there is no speech, reply with nothing.',
                      },
                      { type: 'input_audio', input_audio: { data: wav.toString('base64'), format: 'wav' } },
                    ],
                  },
                ],
              }),
              signal: AbortSignal.timeout(25_000),
            },
          );
          if (!res.ok) throw failure('Gemini', res.status);
          const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
          return (json.choices?.[0]?.message?.content ?? '').trim();
        },
      });
    }
    return list;
  }

  async transcribe(wav: Buffer): Promise<TranscribeResult> {
    if (!looksLikeWav(wav)) throw new UserFacingError('That audio was not in a supported format.');
    const engines = this.engines();
    if (engines.length === 0) return null;

    const hint = `${VOCAB_HINT} ${this.settings.get().voice.wakeWord.phrase}.`;
    let last: unknown;
    for (const engine of engines) {
      try {
        const text = await engine.run(wav, hint);
        return { text: isPhantomTranscript(text) ? '' : text };
      } catch (error) {
        last = error;
        logger.warn(`${engine.name} speech recognition failed, trying the next one`, error);
      }
    }
    throw last instanceof UserFacingError
      ? last
      : new UserFacingError('Could not reach the speech service. Check your internet connection.');
  }
}
