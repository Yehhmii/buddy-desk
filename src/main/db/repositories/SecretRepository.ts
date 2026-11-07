import type { Db } from '../database';

/** Stores already-encrypted blobs. Encryption lives in SecretsService. */
export class SecretRepository {
  constructor(private readonly db: Db) {}

  get(name: string): Buffer | null {
    const row = this.db.prepare('SELECT value FROM secrets WHERE name = ?').get(name) as
      { value: Buffer } | undefined;
    return row?.value ?? null;
  }

  set(name: string, value: Buffer): void {
    this.db
      .prepare(
        'INSERT INTO secrets (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value',
      )
      .run(name, value);
  }

  delete(name: string): void {
    this.db.prepare('DELETE FROM secrets WHERE name = ?').run(name);
  }
}
