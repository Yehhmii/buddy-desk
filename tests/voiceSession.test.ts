import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/settings';
import { isEndPhrase } from '@shared/wakeWord';
import { VoiceSession, type Recorder, type SessionCallbacks } from '@/features/voice/VoiceSession';
import type { MicHub } from '@/features/voice/audio/MicHub';
import type { Recording } from '@/features/voice/audio/recordUtterance';

const speech = (ms = 2000): Recording => ({
  wav: new ArrayBuffer(100),
  samples: new Float32Array(10),
  heardSpeech: true,
  speechMs: ms,
});
const silence: Recording = {
  wav: new ArrayBuffer(0),
  samples: new Float32Array(0),
  heardSpeech: false,
  speechMs: 0,
};

function setup(opts: {
  recordings: Recording[];
  transcripts: string[];
  replies: string[];
  settings?: Partial<AppSettings['voice']>;
  agentError?: boolean;
}) {
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    voice: { ...DEFAULT_SETTINGS.voice, ...opts.settings },
  };
  const recordCalls: Array<{ prerollSeconds: number; noSpeechMs: number }> = [];
  const recorder: Recorder = async (_mic, o) => {
    recordCalls.push({ prerollSeconds: o.prerollSeconds, noSpeechMs: o.noSpeechMs });
    return opts.recordings.shift() ?? silence;
  };
  const states: string[] = [];
  const convo: boolean[] = [];
  const said: string[] = [];
  const notices: string[] = [];
  const cb: SessionCallbacks = {
    onState: (s) => states.push(s),
    onConversation: (a) => convo.push(a),
    onUser: () => undefined,
    onAssistant: () => undefined,
    onNotice: (n) => notices.push(n),
  };
  const mic = {
    acquire: vi.fn(async () => undefined),
    release: vi.fn(),
    level: () => 0,
  } as unknown as MicHub;
  const run = vi.fn(async (text: string) => {
    if (opts.agentError) throw new Error('model down');
    return { reply: opts.replies.shift() ?? 'Done.', actions: [{ tool: 't', ok: true, summary: text }] };
  });
  const cues = { listen: vi.fn(), end: vi.fn() };
  const session = new VoiceSession(
    mic,
    { speak: async (t) => void said.push(t), stop: vi.fn(), level: () => 0 },
    () => settings,
    cb,
    { transcribe: async () => opts.transcripts.shift() ?? '', run },
    cues,
    recorder,
  );
  const done = async (): Promise<void> => {
    for (let i = 0; i < 300 && !convo.includes(false); i++) await new Promise((r) => setTimeout(r, 10));
  };
  return { session, run, cues, states, convo, said, notices, recordCalls, mic, done };
}

describe('conversation loop', () => {
  it('keeps listening after each reply until an end phrase', async () => {
    const t = setup({
      recordings: [speech(), speech(), speech()],
      transcripts: ['add milk to my tasks', 'make it high priority', 'goodbye'],
      replies: ['Added milk.', 'Marked high priority.'],
    });
    t.session.trigger('hotkey');
    await t.done();
    expect(t.run).toHaveBeenCalledTimes(2);
    expect(t.convo).toEqual([true, false]);
    expect(t.recordCalls).toHaveLength(3);
    expect(t.recordCalls[1]?.prerollSeconds).toBe(0); // follow-ups need no wake word and no pre-roll
    expect(t.said).toContain('Okay, talk to you later.');
    expect(t.states.at(-1)).toBe('idle');
    expect(t.mic.release).toHaveBeenCalledTimes(1); // one mic session for the whole conversation
  });

  it('never goes idle between turns', async () => {
    const t = setup({
      recordings: [speech(), speech(), speech()],
      transcripts: ['a', 'b', 'bye'],
      replies: ['one', 'two'],
    });
    t.session.trigger('click');
    await t.done();
    expect(t.states.slice(0, -1)).not.toContain('idle');
  });

  it('ends quietly after silence', async () => {
    const t = setup({
      recordings: [speech(), silence],
      transcripts: ['what is pending'],
      replies: ['Two tasks.'],
    });
    t.session.trigger('hotkey');
    await t.done();
    expect(t.run).toHaveBeenCalledTimes(1);
    expect(t.cues.end).toHaveBeenCalled();
    expect(t.convo).toEqual([true, false]);
  });

  it('answers once when conversation mode is off', async () => {
    const t = setup({
      recordings: [speech(), speech()],
      transcripts: ['hello', 'again'],
      replies: ['Hi.'],
      settings: { conversationMode: false },
    });
    t.session.trigger('hotkey');
    await t.done();
    expect(t.run).toHaveBeenCalledTimes(1);
    expect(t.recordCalls).toHaveLength(1);
  });

  it('waits longer for an answer after a question', async () => {
    const t = setup({
      recordings: [speech(), silence],
      transcripts: ['add a task'],
      replies: ['What should the title be?'],
      settings: { followUpSeconds: 5 },
    });
    t.session.trigger('hotkey');
    await t.done();
    expect(t.recordCalls[1]?.noSpeechMs).toBeGreaterThanOrEqual(15_000);
  });

  it('waits for the command when only the wake phrase was said', async () => {
    const t = setup({
      recordings: [speech(800), speech(1800), silence],
      transcripts: ['add milk'], // the wake-only clip is not sent for transcription at all
      replies: ['Added.'],
    });
    t.session.trigger('wake');
    await t.done();
    expect(t.recordCalls[0]?.prerollSeconds).toBe(4);
    expect(t.recordCalls[1]?.prerollSeconds).toBe(0);
    expect(t.run).toHaveBeenCalledWith('add milk');
    expect(['Uhhh', 'Yes, Alex', 'Yes']).toContain(t.said[0]);
    expect(t.said[1]).toBe('Added.');
  });

  it('strips the wake phrase from a one-breath command', async () => {
    const t = setup({
      recordings: [speech(3000), silence],
      transcripts: ['Hey Jarvis, add milk to my tasks'],
      replies: ['Added.'],
    });
    t.session.trigger('wake');
    await t.done();
    expect(t.run).toHaveBeenCalledWith('add milk to my tasks');
  });

  it('can be ended from the UI', async () => {
    const t = setup({
      recordings: [speech(), speech(), speech()],
      transcripts: ['one', 'two', 'three'],
      replies: ['a', 'b', 'c'],
    });
    t.session.trigger('hotkey');
    await new Promise((r) => setTimeout(r, 30));
    t.session.endConversation();
    await t.done();
    expect(t.convo).toEqual([true, false]);
    expect(t.run.mock.calls.length).toBeLessThan(3);
  });

  it('ends and reports when the assistant fails', async () => {
    const t = setup({ recordings: [speech()], transcripts: ['do it'], replies: [], agentError: true });
    t.session.trigger('hotkey');
    await t.done();
    expect(t.notices).toContain('model down');
    expect(t.convo).toEqual([true, false]);
  });
});

describe('echo guard', () => {
  it('ignores a follow-up that is just Jarvis being heard by the mic', async () => {
    const t = setup({
      recordings: [speech(), speech(), silence, silence],
      transcripts: ['add buy milk', 'Added buy milk to your tasks'],
      replies: ['Added buy milk to your tasks.'],
    });
    t.session.trigger('hotkey');
    await t.done();
    expect(t.run).toHaveBeenCalledTimes(1); // the echo did not become a second request
  });

  it('still accepts a genuine follow-up', async () => {
    const t = setup({
      recordings: [speech(), speech(), silence],
      transcripts: ['add buy milk', 'make it high priority'],
      replies: ['Added buy milk to your tasks.', 'Done.'],
    });
    t.session.trigger('hotkey');
    await t.done();
    expect(t.run).toHaveBeenCalledTimes(2);
  });
});

describe('isEndPhrase', () => {
  it('recognises built-in and custom phrases', () => {
    expect(isEndPhrase('Goodbye!', 'goodbye')).toBe(true);
    expect(isEndPhrase("that's all, thanks", 'goodbye')).toBe(true);
    expect(isEndPhrase('ok buddy end conversation', 'goodbye')).toBe(true);
    expect(isEndPhrase('over and out', 'over and out')).toBe(true);
  });

  it('does not end on phrases buried in real requests', () => {
    expect(isEndPhrase('add a reminder to say goodbye to Sam tomorrow morning', 'goodbye')).toBe(false);
    expect(isEndPhrase('add buy milk', 'goodbye')).toBe(false);
    expect(isEndPhrase('', 'goodbye')).toBe(false);
  });
});

describe('day report offer', () => {
  it('reads the report when you say yes', async () => {
    const t = setup({ recordings: [speech()], transcripts: ['yes please'], replies: [] });
    await t.session.offerReport('Here is your day report. Finished today: milk.');
    expect(t.said[0]).toMatch(/Would you like me to read it out/);
    expect(t.said).toContain('Here is your day report. Finished today: milk.');
    expect(t.convo).toEqual([true, false]);
    expect(t.run).not.toHaveBeenCalled(); // the answer is a yes/no, not a request for the assistant
  });

  it('leaves the report alone when you say no', async () => {
    const t = setup({ recordings: [speech()], transcripts: ['not now'], replies: [] });
    await t.session.offerReport('REPORT TEXT');
    expect(t.said).not.toContain('REPORT TEXT');
    expect(t.convo).toEqual([true, false]);
  });

  it('gives up quietly when nobody answers', async () => {
    const t = setup({ recordings: [silence], transcripts: [], replies: [] });
    await t.session.offerReport('REPORT TEXT');
    expect(t.said).not.toContain('REPORT TEXT');
    expect(t.states.at(-1)).toBe('idle');
  });

  it('does not interrupt a conversation already in progress', async () => {
    const t = setup({ recordings: [speech(), silence], transcripts: ['hello'], replies: ['Hi.'] });
    t.session.trigger('hotkey');
    await new Promise((r) => setTimeout(r, 20));
    expect(await t.session.offerReport('REPORT TEXT')).toBe(false);
    await t.done();
  });
});
