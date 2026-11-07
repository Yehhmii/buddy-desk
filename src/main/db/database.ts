import Database from 'better-sqlite3';
import { MIGRATIONS } from './migrations';
import { logger } from '../core/logger';

export type Db = Database.Database;

export function openDatabase(file: string): Db {
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  migrate(db);
  return db;
}

function migrate(db: Db): void {
  const current = Number(db.pragma('user_version', { simple: true }));
  const pending = MIGRATIONS.filter((m) => m.version > current).sort((a, b) => a.version - b.version);
  for (const migration of pending) {
    db.transaction(() => {
      db.exec(migration.sql);
      db.pragma(`user_version = ${migration.version}`);
    })();
    logger.info(`Database migrated to v${migration.version}`);
  }
}
