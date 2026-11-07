import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { config } from 'dotenv';

/** Loads .env from the project root (dev) and from the user data folder (installed). */
export function loadEnv(): void {
  const candidates = [join(process.cwd(), '.env'), join(app.getPath('userData'), '.env')];
  for (const file of candidates) {
    if (existsSync(file)) config({ path: file, quiet: true });
  }
}

export function envKey(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function wakeModelUrlOverride(): string | undefined {
  const value = process.env['BUDDY_VOSK_MODEL_URL']?.trim();
  return value && value.startsWith('https://') ? value : undefined;
}
