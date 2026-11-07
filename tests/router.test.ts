import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { LlmRouter } from '@main/services/ai/LlmRouter';
import { ProviderError, type ChatResponse, type LlmProvider } from '@main/services/ai/types';

vi.mock('@main/core/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const ok = (provider: 'groq' | 'gemini'): ChatResponse => ({
  content: `from ${provider}`,
  toolCalls: [],
  provider,
  model: 'm',
});

function fake(id: 'groq' | 'gemini', impl: () => Promise<ChatResponse>, vision = false): LlmProvider {
  return { id, supportsVision: vision, isConfigured: () => true, chat: vi.fn(impl) };
}

const settings = () => DEFAULT_SETTINGS;

describe('LlmRouter', () => {
  it('uses the preferred provider first', async () => {
    const router = new LlmRouter(
      [fake('groq', async () => ok('groq')), fake('gemini', async () => ok('gemini'), true)],
      settings,
    );
    expect((await router.chat({ messages: [] })).provider).toBe('groq');
  });

  it('fails over on rate limit and cools the provider down', async () => {
    let now = 1000;
    const groq = fake('groq', async () => {
      throw new ProviderError('groq', 'rate_limit', 'slow down', 60_000);
    });
    const gemini = fake('gemini', async () => ok('gemini'), true);
    const router = new LlmRouter([groq, gemini], settings, () => now);

    expect((await router.chat({ messages: [] })).provider).toBe('gemini');
    await router.chat({ messages: [] });
    expect(groq.chat).toHaveBeenCalledTimes(1); // skipped while cooling down

    now += 61_000;
    await router.chat({ messages: [] });
    expect(groq.chat).toHaveBeenCalledTimes(2);
  });

  it('routes vision requests only to vision providers', async () => {
    const groq = fake('groq', async () => ok('groq'));
    const gemini = fake('gemini', async () => ok('gemini'), true);
    const router = new LlmRouter([groq, gemini], settings);
    expect((await router.chat({ messages: [], needsVision: true })).provider).toBe('gemini');
    expect(groq.chat).not.toHaveBeenCalled();
  });

  it('retries a malformed tool call once on the same provider', async () => {
    let calls = 0;
    const groq = fake('groq', async () => {
      calls++;
      if (calls === 1) throw new ProviderError('groq', 'tool_format', 'bad call');
      return ok('groq');
    });
    const router = new LlmRouter([groq], settings);
    expect((await router.chat({ messages: [] })).content).toBe('from groq');
    expect(calls).toBe(2);
  });

  it('gives a friendly error when nothing is configured', async () => {
    const none: LlmProvider = { id: 'groq', supportsVision: false, isConfigured: () => false, chat: vi.fn() };
    await expect(new LlmRouter([none], settings).chat({ messages: [] })).rejects.toThrow(/Add a key/);
  });
});
