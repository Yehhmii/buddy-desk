import { safeStorage } from 'electron';
import { PROVIDER_IDS, type KeyState, type ProviderId, type SecretStatus } from '@shared/types';
import type { SecretRepository } from '../../db/repositories/SecretRepository';
import { envKey } from '../../config/env';
import { UserFacingError } from '../../core/errors';
import { logger } from '../../core/logger';

const ENV_NAMES: Record<ProviderId, string> = {
  groq: 'GROQ_API_KEY',
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

/**
 * API keys never leave the main process. The renderer only learns whether a key exists.
 * Stored keys are encrypted with the OS keychain (DPAPI on Windows) through safeStorage.
 *
 * Electron's encryption calls are asynchronous, so keys are decrypted once at start-up (init)
 * and kept in memory. Everything else can then read them synchronously.
 */
export class SecretsService {
  private readonly cache = new Map<ProviderId, string>();
  private encryptionAvailable = false;

  constructor(private readonly repo: SecretRepository) {}

  async init(): Promise<void> {
    this.encryptionAvailable = await safeStorage.isAsyncEncryptionAvailable();
    if (!this.encryptionAvailable) return;
    for (const provider of PROVIDER_IDS) {
      const blob = this.repo.get(provider);
      if (!blob) continue;
      try {
        const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(blob);
        this.cache.set(provider, result);
        if (shouldReEncrypt) this.repo.set(provider, await safeStorage.encryptStringAsync(result));
      } catch (error) {
        logger.warn(`Could not decrypt the saved ${provider} key. Enter it again in Settings.`, error);
      }
    }
  }

  get(provider: ProviderId): string | undefined {
    return this.cache.get(provider) ?? envKey(ENV_NAMES[provider]);
  }

  async set(provider: ProviderId, key: string): Promise<SecretStatus> {
    if (!this.encryptionAvailable) {
      throw new UserFacingError(
        'Secure storage is not available on this system. Put the key in your .env file instead.',
      );
    }
    this.repo.set(provider, await safeStorage.encryptStringAsync(key));
    this.cache.set(provider, key);
    return this.status();
  }

  clear(provider: ProviderId): SecretStatus {
    this.repo.delete(provider);
    this.cache.delete(provider);
    return this.status();
  }

  status(): SecretStatus {
    const describe = (provider: ProviderId): KeyState => {
      if (this.cache.has(provider)) return { configured: true, source: 'stored' };
      if (envKey(ENV_NAMES[provider])) return { configured: true, source: 'env' };
      return { configured: false, source: null };
    };
    return {
      groq: describe('groq'),
      gemini: describe('gemini'),
      openai: describe('openai'),
      anthropic: describe('anthropic'),
      encryptionAvailable: this.encryptionAvailable,
    };
  }
}
