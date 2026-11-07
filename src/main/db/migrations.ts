export interface Migration {
  version: number;
  sql: string;
}

/** Append-only. Never edit a shipped migration, add a new one. */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','removed')),
        priority INTEGER NOT NULL DEFAULT 0 CHECK (priority IN (0,1)),
        due_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      );
      CREATE INDEX idx_tasks_status ON tasks(status);

      CREATE TABLE task_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        at INTEGER NOT NULL,
        title TEXT NOT NULL
      );
      CREATE INDEX idx_task_events_at ON task_events(at);

      CREATE TABLE alarms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('alarm','timer')),
        time TEXT,
        repeat_days TEXT NOT NULL DEFAULT '[]',
        enabled INTEGER NOT NULL DEFAULT 1,
        next_fire_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE kv (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE secrets (
        name TEXT PRIMARY KEY,
        value BLOB NOT NULL
      );

      CREATE TABLE reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        markdown TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `,
  },
  {
    version: 2,
    sql: `
      CREATE TABLE task_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        file TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);
    `,
  },
];
