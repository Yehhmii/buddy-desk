import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { reportToSpeech } from '@shared/reportSpeech';
import type { DailyReport, VoiceSnapshot } from '@shared/types';
import type { WakeSensitivity } from '@shared/wakeWord';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import { useWakeStore } from '@/stores/useWakeStore';
import { MicHub } from './audio/MicHub';
import { SpeechPlayer } from './audio/SpeechPlayer';
import { VoiceSession, type TriggerSource } from './VoiceSession';
import { playEndCue, playListenCue } from './audio/cues';
import { recordUtterance } from './audio/recordUtterance';
import { WakeController } from './wake/WakeController';
import { WakeWordDetector } from './wake/WakeWordDetector';

export interface VoiceApi {
  trigger: (source: TriggerSource) => void;
  submitText: (text: string) => Promise<void>;
  say: (text: string) => Promise<void>;
  endConversation: () => void;
  /** Asks whether to read the day report aloud. Resolves false if Jarvis is busy right now. */
  offerReport: (report: DailyReport) => Promise<boolean>;
  level: () => number;
  testWake: (
    phrase: string,
    sensitivity: WakeSensitivity,
    onHeard: (t: string) => void,
    onHit: () => void,
  ) => Promise<() => void>;
}

const VoiceContext = createContext<VoiceApi | null>(null);

export function useVoice(): VoiceApi {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used inside VoiceProvider');
  return ctx;
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const settingsRef = useRef(useSettingsStore.getState().settings);
  useEffect(() => {
    return useSettingsStore.subscribe((s) => {
      settingsRef.current = s.settings;
    });
  }, []);

  const engine = useMemo(() => {
    const ui = useUiStore.getState;
    const mic = new MicHub();
    const player = new SpeechPlayer();

    // Mirror what is happening to the floating overlay (it lives in another window).
    const snap: VoiceSnapshot = { state: 'idle', userText: '', replyText: '', notice: '', actions: [] };
    const flush = (): void => void window.api.voice.report({ ...snap }).catch(() => undefined);
    let levelTimer: ReturnType<typeof setInterval> | null = null;
    const pumpLevel = (on: boolean): void => {
      if (on && !levelTimer) levelTimer = setInterval(() => window.api.voice.level(session.level()), 50);
      if (!on && levelTimer) {
        clearInterval(levelTimer);
        levelTimer = null;
      }
    };

    const detector = new WakeWordDetector(mic);
    const session: VoiceSession = new VoiceSession(
      mic,
      player,
      () => settingsRef.current,
      {
        onState: (s) => {
          ui().setVoiceState(s);
          snap.state = s;
          if (s === 'listening')
            Object.assign(snap, { userText: '', replyText: '', notice: '', actions: [] });
          pumpLevel(s !== 'idle');
          flush();
        },
        onConversation: (active) => ui().setConversation(active),
        onUser: (text) => {
          ui().pushEntry({ role: 'user', text });
          Object.assign(snap, { userText: text, replyText: '', notice: '', actions: [] });
          flush();
        },
        onAssistant: (text, actions) => {
          ui().pushEntry({ role: 'assistant', text, actions });
          Object.assign(snap, { replyText: text, actions });
          flush();
        },
        onNotice: (text) => {
          ui().pushEntry({ role: 'notice', text });
          snap.notice = text;
          flush();
        },
      },
      {
        transcribe: async (recording) => {
          const cloud = await window.api.speech.transcribe(recording.wav);
          if (cloud) return cloud.text;
          // No cloud speech service has a key: fall back to the offline engine if its model is installed.
          if (!useWakeStore.getState().model?.installed) {
            throw new Error(
              'Voice input needs a speech service. Add a free Groq key or an OpenAI key, or download the offline voice model in Settings.',
            );
          }
          return detector.transcribe(recording.samples);
        },
        run: (text) => window.api.agent.run(text),
      },
      { listen: playListenCue, end: playEndCue },
      recordUtterance,
    );
    const wake = new WakeController(
      mic,
      detector,
      () => session.trigger('wake'),
      (runtime, error) => useWakeStore.getState().setRuntime(runtime, error ?? null),
    );
    const api: VoiceApi = {
      trigger: (source) => session.trigger(source),
      submitText: (text) => session.submitText(text),
      say: (text) => session.say(text),
      endConversation: () => session.endConversation(),
      offerReport: (report) => session.offerReport(reportToSpeech(report.markdown)),
      level: () => session.level(),
      testWake: (phrase, sensitivity, onHeard, onHit) => wake.test(phrase, sensitivity, onHeard, onHit),
    };
    return { api, wake };
  }, []);

  const settings = useSettingsStore((s) => s.settings);
  const voiceState = useUiStore((s) => s.voiceState);
  const modelInstalled = useWakeStore((s) => s.model?.installed ?? false);

  useEffect(() => {
    if (!settings) return;
    engine.wake.sync({
      enabled: settings.voice.wakeWord.enabled,
      phrase: settings.voice.wakeWord.phrase,
      sensitivity: settings.voice.wakeWord.sensitivity,
      modelInstalled,
      voiceIdle: voiceState === 'idle',
    });
  }, [engine, settings, modelInstalled, voiceState]);

  return <VoiceContext.Provider value={engine.api}>{children}</VoiceContext.Provider>;
}
