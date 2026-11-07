import type { KeyTestResult, ProviderId } from '@shared/types';
import type { AppSettings } from '@shared/settings';
import { UserFacingError } from '../../core/errors';
import { logger } from '../../core/logger';
import { ProviderError, type ChatRequest, type ChatResponse, type LlmProvider } from './types';

/** Free options first, then paid ones. Used when the preference is Auto. */
const DEFAULT_ORDER: ProviderId[] = ['groq', 'gemini', 'openai', 'anthropic'];
const DEFAULT_COOLDOWN_MS = 30_000;
const AUTH_COOLDOWN_MS = 5 * 60_000;
/** A rate limit that clears this fast is worth waiting out instead of switching provider. */
const SHORT_WAIT_MS = 4_000;

/**
 * Picks a provider per request and fails over when one is rate limited, down or misconfigured.
 * Vision requests only go to providers that can read images.
 */
export class LlmRouter {
  private readonly cooldownUntil = new Map<ProviderId, number>();

  constructor(
    private readonly providers: LlmProvider[],
    private readonly getSettings: () => AppSettings,
    private readonly clock: () => number = Date.now,
  ) {}

  /** Sends a tiny request to check that a saved key and model name work. Never touches failover or cooldowns. */
  async probe(id: ProviderId): Promise<KeyTestResult> {
    const provider = this.providers.find((p) => p.id === id);
    if (!provider || !provider.isConfigured()) return { ok: false, message: 'No key saved yet.' };
    try {
      await provider.chat({
        messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
        maxTokens: 24,
      });
      return { ok: true, message: 'Works.' };
    } catch (error) {
      if (error instanceof ProviderError) {
        if (error.kind === 'auth')
          return { ok: false, message: 'The provider rejected this key. Check that you copied all of it.' };
        if (error.kind === 'model_unavailable')
          return {
            ok: false,
            message:
              'The key is accepted, but the model name is not available. Change it in Settings > AI providers.',
          };
        if (error.kind === 'rate_limit')
          return { ok: true, message: 'The key works (the provider is rate limiting right now).' };
        if (error.kind === 'network')
          return { ok: false, message: 'Could not reach the provider. Check your internet connection.' };
        return { ok: false, message: error.message.slice(0, 160) };
      }
      return { ok: false, message: 'The test failed.' };
    }
  }

  hasAnyProvider(): boolean {
    return this.providers.some((p) => p.isConfigured());
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const candidates = this.order(request.needsVision === true);
    if (candidates.length === 0) {
      const capable = this.providers.filter(
        (p) => p.isConfigured() && (!request.needsVision || p.supportsVision),
      );
      if (capable.length > 0)
        throw new UserFacingError('The AI providers are cooling down after an error. Try again in a minute.');
      throw new UserFacingError(
        request.needsVision
          ? 'Reading images needs a Gemini, OpenAI or Claude key. Add one in Settings.'
          : 'No AI provider is set up. Add a key in Settings > AI providers.',
      );
    }

    let lastError: unknown;
    for (const provider of candidates) {
      try {
        return await this.callWithFormatRetry(provider, request);
      } catch (error) {
        if (request.signal?.aborted) throw error;
        lastError = error;
        if (!(error instanceof ProviderError)) throw error;
        logger.warn(`${provider.id} failed (${error.kind}): ${error.message}`);
        if (error.kind === 'bad_request')
          throw new UserFacingError(`The AI provider rejected the request: ${error.message}`);
        this.applyCooldown(provider.id, error);
      }
    }
    throw new UserFacingError(friendlyFailure(lastError));
  }

  /** A malformed tool call or a rate limit that clears within seconds gets one more try on the same provider. */
  private async callWithFormatRetry(provider: LlmProvider, request: ChatRequest): Promise<ChatResponse> {
    try {
      return await provider.chat(request);
    } catch (error) {
      if (error instanceof ProviderError && error.kind === 'tool_format') return provider.chat(request);
      if (
        error instanceof ProviderError &&
        error.kind === 'rate_limit' &&
        error.retryAfterMs !== undefined &&
        error.retryAfterMs <= SHORT_WAIT_MS
      ) {
        await new Promise((resolve) => setTimeout(resolve, error.retryAfterMs! + 150));
        return provider.chat(request);
      }
      throw error;
    }
  }

  private order(needsVision: boolean): LlmProvider[] {
    const preference = this.getSettings().ai.provider;
    const preferred: ProviderId[] =
      preference === 'auto'
        ? DEFAULT_ORDER
        : [preference, ...DEFAULT_ORDER.filter((id) => id !== preference)];
    const now = this.clock();
    return preferred
      .map((id) => this.providers.find((p) => p.id === id))
      .filter((p): p is LlmProvider => Boolean(p))
      .filter((p) => p.isConfigured())
      .filter((p) => !needsVision || p.supportsVision)
      .filter((p) => (this.cooldownUntil.get(p.id) ?? 0) <= now);
  }

  private applyCooldown(id: ProviderId, error: ProviderError): void {
    const base =
      error.kind === 'auth' || error.kind === 'model_unavailable'
        ? AUTH_COOLDOWN_MS
        : (error.retryAfterMs ?? DEFAULT_COOLDOWN_MS);
    if (error.kind === 'tool_format') return; // one bad generation says nothing about provider health
    this.cooldownUntil.set(id, this.clock() + base);
  }
}

function friendlyFailure(error: unknown): string {
  if (error instanceof ProviderError) {
    if (error.kind === 'rate_limit')
      return 'Both AI providers are rate limited right now. Try again in a minute.';
    if (error.kind === 'auth') return 'An AI provider rejected its API key. Check your keys in Settings.';
    if (error.kind === 'model_unavailable')
      return 'An AI model you selected is no longer available. Update the model name in Settings > AI providers.';
    if (error.kind === 'network') return 'Could not reach the AI provider. Check your internet connection.';
  }
  return 'The AI providers are not responding. Try again shortly.';
}
