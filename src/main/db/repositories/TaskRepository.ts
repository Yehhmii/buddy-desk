import type { Attachment, Task, TaskEvent, TaskEventType, TaskPriority, TaskStatus } from '@shared/types';
import type { Db } from '../database';

interface TaskRow {
  id: number;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: number | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

interface EventRow {
  id: number;
  task_id: number;
  type: TaskEventType;
  at: number;
  title: string;
}

interface AttachmentRow {
  id: number;
  task_id: number;
  file: string;
  created_at: number;
}

const toAttachment = (r: AttachmentRow): Attachment => ({ id: r.id, file: r.file, createdAt: r.created_at });

const toTask = (r: TaskRow, attachments: Attachment[] = []): Task => ({
  id: r.id,
  title: r.title,
  notes: r.notes,
  status: r.status,
  priority: r.priority,
  dueAt: r.due_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  completedAt: r.completed_at,
  attachments,
});

export class TaskRepository {
  constructor(private readonly db: Db) {}

  insert(
    input: { title: string; notes: string; priority: TaskPriority; dueAt: number | null },
    now: number,
  ): Task {
    const info = this.db
      .prepare(
        'INSERT INTO tasks (title, notes, priority, due_at, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      )
      .run(input.title, input.notes, input.priority, input.dueAt, now, now);
    return this.mustGet(Number(info.lastInsertRowid));
  }

  get(id: number): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    return row ? toTask(row, this.attachmentsFor([id]).get(id) ?? []) : null;
  }

  private attachmentsFor(taskIds: number[]): Map<number, Attachment[]> {
    const map = new Map<number, Attachment[]>();
    if (taskIds.length === 0) return map;
    const marks = taskIds.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT * FROM task_attachments WHERE task_id IN (${marks}) ORDER BY created_at ASC, id ASC`)
      .all(...taskIds) as AttachmentRow[];
    for (const row of rows) {
      const list = map.get(row.task_id) ?? [];
      list.push(toAttachment(row));
      map.set(row.task_id, list);
    }
    return map;
  }

  addAttachment(taskId: number, file: string, now: number): Attachment {
    const info = this.db
      .prepare('INSERT INTO task_attachments (task_id, file, created_at) VALUES (?,?,?)')
      .run(taskId, file, now);
    return { id: Number(info.lastInsertRowid), file, createdAt: now };
  }

  /** Removes the row and returns the file name so the caller can delete the image. */
  removeAttachment(taskId: number, attachmentId: number): string | null {
    const row = this.db
      .prepare('SELECT * FROM task_attachments WHERE id = ? AND task_id = ?')
      .get(attachmentId, taskId) as AttachmentRow | undefined;
    if (!row) return null;
    this.db.prepare('DELETE FROM task_attachments WHERE id = ?').run(attachmentId);
    return row.file;
  }

  private mustGet(id: number): Task {
    const task = this.get(id);
    if (!task) throw new Error(`Task ${id} vanished after write`);
    return task;
  }

  listByStatus(statuses: TaskStatus[]): Task[] {
    const marks = statuses.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT * FROM tasks WHERE status IN (${marks}) ORDER BY created_at ASC, id ASC`)
      .all(...statuses) as TaskRow[];
    const attachments = this.attachmentsFor(rows.map((r) => r.id));
    return rows.map((r) => toTask(r, attachments.get(r.id) ?? []));
  }

  update(
    id: number,
    fields: Partial<Pick<Task, 'title' | 'notes' | 'priority' | 'dueAt' | 'status' | 'completedAt'>>,
    now: number,
  ): Task {
    const columns: Record<string, string> = {
      title: 'title',
      notes: 'notes',
      priority: 'priority',
      dueAt: 'due_at',
      status: 'status',
      completedAt: 'completed_at',
    };
    const sets: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];
    for (const [key, value] of Object.entries(fields)) {
      const column = columns[key];
      if (column === undefined || value === undefined) continue;
      sets.push(`${column} = ?`);
      values.push(value);
    }
    this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
    return this.mustGet(id);
  }

  logEvent(taskId: number, type: TaskEventType, title: string, at: number): void {
    this.db
      .prepare('INSERT INTO task_events (task_id, type, at, title) VALUES (?,?,?,?)')
      .run(taskId, type, at, title);
  }

  eventsBetween(from: number, to: number): TaskEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM task_events WHERE at >= ? AND at < ? ORDER BY at ASC, id ASC')
      .all(from, to) as EventRow[];
    return rows.map((r) => ({ id: r.id, taskId: r.task_id, type: r.type, at: r.at, title: r.title }));
  }
}
