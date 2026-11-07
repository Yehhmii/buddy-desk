import { looksLikeEcho } from '@shared/echo';
import { isPhantomTranscript } from '@shared/stt';
import { parseYesNo } from '@shared/yesNo';
import { extractCommandAfterWake, isEndPhrase, pickWakeGreeting } from '@shared/wakeWord';
import type { AppSettings } from '@shared/settings';
import type { AgentResult, VoiceState } from '@shared/types';
import { toSpeakable } from '@/lib/speakable';
import type { MicHub } from './audio/MicHub';
import type { RecordOptions, Recording } from './audio/recordUtterance';

export type TriggerSource = 'hotkey' | 'wake' | 'click';

export interface SessionCallbacks {
  onState: (state: VoiceState) => void;
  onConversation: (active: boolean) => void;
  onUser: (text: string) => void;
  onAssistant: (text: string, actions: Array<{ ok: boolean; summary: string }>) => void;
  onNotice: (text: string) => void;
}

/** Everything the session needs from the outside world, so it can be tested with fakes. */
export interface VoiceGateway {
  transcribe(recording: Recording): Promise<string>;
  run(text: string): Promise<AgentResult>;
}

export interface VoiceCues {
  listen(): void;
  end(): void;
}

export interface SpeechOutput {
  speak(text: string): Promise<void>;
  stop(): void;
  level(): number;
}

export type Recorder = (mic: MicHub, options: RecordOptions) => Promise<Recording>;

type HearSource = TriggerSource | 'followup';

const MAX_UTTERANCE_MS = 20_000;
/** How long to wait for the first words after the orb is tapped or the shortcut is pressed. */
const FIRST_TURN_WAIT_MS = 6_000;
/** After a question from Jarvis, give the user at least this long to answer. */
const QUESTION_WAIT_MS = 15_000;
/** A wake phrase alone lasts about a second. Anything shorter means no command followed. */
const WAKE_ONLY_MS = 1_300;
const WAKE_PREROLL_S = 4;
const MANUAL_PREROLL_S = 0.3;
/** Lets the speakers go quiet before the microphone listens again. */
const AFTER_SPEECH_PAUSE_MS = 600;
const FAREWELL = 'Okay, talk to you later.';
const REPORT_QUESTION = 'Your day report is ready. Would you like me to read it out?';
const REPORT_ANSWER_WAIT_MS = 15_000;

/**
 * The conversation loop. One wake word (or shortcut press) opens a conversation that keeps
 * listening after every reply until the user says an end phrase, stays silent for too long,
 * or ends it from the UI. The microphone stays open for the whole conversation.
 */
export class VoiceSession {
  private state: VoiceState = 'idle';
  private conversing = false;
  private lastReply = '';
  private abort: AbortController | null = null;

  constructor(
    private readonly mic: MicHub,
    private readonly speech: SpeechOutput,
    private readonly getSettings: () => AppSettings | null,
    private readonly cb: SessionCallbacks,
    private readonly gateway: VoiceGateway,
    private readonly cues: VoiceCues,
    private readonly recorder: Recorder,
  ) {}

  getState(): VoiceState {
    return this.state;
  }

  isConversing(): boolean {
    return this.conversing;
  }

  level(): number {
    switch (this.state) {
      case 'listening':
        return this.mic.level();
      case 'speaking':
        return this.speech.level();
      case 'thinking':
        return 0.2;
      default:
        return 0;
    }
  }

  /** Hotkey, wake word or orb tap. What it does depends on what Jarvis is doing right now. */
  trigger(source: TriggerSource): void {
    if (this.state === 'idle') {
      void this.converse(source);
    } else if (this.state === 'listening') {
      this.abort?.abort(); // "I'm done talking"
    } else if (this.state === 'speaking') {
      this.speech.stop(); // barge in: the loop moves straight on to listening
      if (!this.conversing) void this.converse(source);
    }
  }

  /** Ends the conversation now, wherever it is in the loop. */
  endConversation(): void {
    if (!this.conversing) return;
    this.conversing = false;
    this.abort?.abort();
    this.speech.stop();
  }

  /**
   * Asks whether to read the day report aloud, listens for yes or no, and reads it if asked. Does nothing
   * if Jarvis is busy; the caller retries once it is idle.
   */
  async offerReport(reportSpeech: string): Promise<boolean> {
    const settings = this.getSettings();
    if (!settings || this.state !== 'idle' || this.conversing) return false;
    this.conversing = true;
    this.lastReply = REPORT_QUESTION;
    this.cb.onConversation(true);
    this.cb.onAssistant(REPORT_QUESTION, []);

    let micOpen = false;
    try {
      if (settings.voice.speakReplies) {
        this.set('speaking');
        await this.speech.speak(REPORT_QUESTION);
      }
      await this.mic.acquire();
      micOpen = true;
      const answer = await this.hear('followup', REPORT_ANSWER_WAIT_MS);
      if (this.conversing && answer) {
        const verdict = parseYesNo(answer);
        if (verdict === 'yes') {
          this.cb.onAssistant('Reading it now.', []);
          this.set('speaking');
          await this.speech.speak(reportSpeech);
        } else {
          this.cb.onAssistant('Okay, it is waiting in the Report tab.', []);
        }
      }
    } catch (error) {
      this.cb.onNotice(error instanceof Error ? error.message : 'Could not read the report.');
    } finally {
      if (micOpen) this.mic.release();
      this.finish('offer');
    }
    return true;
  }

  async submitText(text: string): Promise<void> {
    if (this.state !== 'idle') return;
    try {
      await this.respond(text, false);
    } finally {
      this.set('idle');
    }
  }

  /** Reads text aloud without going through the model (used for the launch briefing). */
  async say(text: string): Promise<void> {
    if (this.state !== 'idle') return;
    this.set('speaking');
    try {
      await this.speech.speak(toSpeakable(text));
    } finally {
      this.set('idle');
    }
  }

  private async converse(source: TriggerSource): Promise<void> {
    if (!this.getSettings()) return;
    this.conversing = true;
    this.lastReply = '';
    this.cb.onConversation(true);

    let endedBy: 'silence' | 'phrase' | 'error' | 'user' = 'user';
    try {
      await this.mic.acquire();
    } catch {
      this.cb.onNotice('Microphone access was blocked. Allow it in Windows privacy settings.');
      this.finish('error');
      return;
    }

    try {
      let hearSource: HearSource = source;
      let waitMs = FIRST_TURN_WAIT_MS;
      let blanks = 0;

      while (this.conversing) {
        const text = await this.hear(hearSource, waitMs);
        if (!this.conversing) break;
        if (text === null) {
          endedBy = 'silence';
          break;
        }
        if (text === '') {
          if (++blanks >= 2) {
            endedBy = 'silence';
            break;
          }
          hearSource = 'followup';
          continue;
        }
        blanks = 0;

        const settings = this.getSettings();
        if (settings && isEndPhrase(text, settings.voice.endPhrase)) {
          endedBy = 'phrase';
          break;
        }

        const reply = await this.respond(text, true);
        if (reply === null) {
          endedBy = 'error';
          break;
        }
        if (!settings?.voice.conversationMode) {
          endedBy = 'user';
          break;
        }

        hearSource = 'followup';
        const base = (settings?.voice.followUpSeconds ?? 8) * 1000;
        waitMs = reply.trim().endsWith('?') ? Math.max(base, QUESTION_WAIT_MS) : base;
        await new Promise((r) => setTimeout(r, AFTER_SPEECH_PAUSE_MS));
      }
    } catch (error) {
      this.cb.onNotice(error instanceof Error ? error.message : 'Voice input failed.');
      endedBy = 'error';
    } finally {
      this.mic.release();
    }
    await this.finishWith(endedBy);
  }

  /** Listens for one utterance. null means nobody spoke, '' means speech that produced no words. */
  private async hear(source: HearSource, noSpeechMs: number): Promise<string | null> {
    const settings = this.getSettings();
    if (!settings) return null;
    this.set('listening');
    if (settings.voice.chime && source !== 'followup') this.cues.listen();

    this.abort = new AbortController();
    const recording = await this.recorder(this.mic, {
      prerollSeconds: source === 'wake' ? WAKE_PREROLL_S : source === 'followup' ? 0 : MANUAL_PREROLL_S,
      silenceMs: settings.voice.silenceMs,
      maxMs: MAX_UTTERANCE_MS,
      noSpeechMs,
      signal: this.abort.signal,
    });
    this.abort = null;

    if (!this.conversing || !recording.heardSpeech) return null;
    if (source === 'wake' && recording.speechMs < WAKE_ONLY_MS) {
      await this.acknowledgeWake();
      return this.hear('followup', FIRST_TURN_WAIT_MS); // only the wake phrase was said, wait for the command
    }

    this.set('thinking');
    const text = await this.gateway.transcribe(recording);
    if (isPhantomTranscript(text)) return '';
    // A follow-up that merely repeats Jarvis's last answer is the speakers leaking into the mic.
    if (source === 'followup' && looksLikeEcho(text, this.lastReply)) return '';
    const cmd = source === 'wake' ? extractCommandAfterWake(text, settings.voice.wakeWord.phrase) : text;
    if (source === 'wake' && !cmd) {
      await this.acknowledgeWake();
      return this.hear('followup', FIRST_TURN_WAIT_MS);
    }
    return cmd;
  }

  private async acknowledgeWake(): Promise<void> {
    const settings = this.getSettings();
    if (!settings || !this.conversing) return;
    const greeting = pickWakeGreeting(settings.general.userName);
    this.lastReply = greeting;
    this.cb.onAssistant(greeting, []);
    if (settings.voice.speakReplies) {
      this.set('speaking');
      await this.speech.speak(greeting);
      await new Promise((r) => setTimeout(r, AFTER_SPEECH_PAUSE_MS));
    }
  }

  /** Runs one request through the agent and speaks the answer. Returns the reply, or null on failure. */
  private async respond(text: string, speak: boolean): Promise<string | null> {
    this.cb.onUser(text);
    this.set('thinking');
    try {
      const result = await this.gateway.run(text);
      this.lastReply = result.reply;
      this.cb.onAssistant(
        result.reply,
        result.actions.map((a) => ({ ok: a.ok, summary: a.summary })),
      );
      if (speak && this.conversing && this.getSettings()?.voice.speakReplies) {
        this.set('speaking');
        await this.speech.speak(toSpeakable(result.reply));
      }
      return result.reply;
    } catch (error) {
      this.cb.onNotice(error instanceof Error ? error.message : 'Something went wrong.');
      return null;
    }
  }

  private async finishWith(reason: 'silence' | 'phrase' | 'error' | 'user'): Promise<void> {
    if (reason === 'phrase') {
      this.cb.onAssistant(FAREWELL, []);
      if (this.getSettings()?.voice.speakReplies && this.conversing) {
        this.set('speaking');
        await this.speech.speak(FAREWELL).catch(() => undefined);
      } else {
        this.cues.end();
      }
    } else if (reason === 'silence') {
      this.cues.end();
    }
    this.finish(reason);
  }

  private finish(_reason: string): void {
    this.conversing = false;
    this.abort = null;
    this.cb.onConversation(false);
    this.set('idle');
  }

  private set(state: VoiceState): void {
    this.state = state;
    this.cb.onState(state);
  }
}
