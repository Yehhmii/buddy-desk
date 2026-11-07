import type { Task, TaskEvent, TaskFilter, TaskInput, TaskPatch, TaskStatus } from '@shared/types';
import { compareTasks } from '@shared/sort';
import { NotFoundError } from '../../core/errors';
import type { Broadcaster } from '../../core/Broadcaster';
import type { TaskRepository } from '../../db/repositories/TaskRepository';

export interface DayActivity {
  created: TaskEvent[];
  completed: TaskEvent[];
  removed: TaskEvent[];
}

export class TaskService {
  constructor(
    private readonly repo: TaskRepository,
    private readonly broadcaster: Broadcaster,
    private readonly clock: () => number = Date.now,
  ) {}

  list(filter: TaskFilter = 'pending'): Task[] {
    const statuses: TaskStatus[] =
      filter === 'pending' ? ['pending'] : filter === 'done' ? ['done'] : ['pending', 'done'];
    const tasks = this.repo.listByStatus(statuses);
    return filter === 'done'
      ? tasks.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      : tasks.sort((a, b) => (a.status === b.status ? compareTasks(a, b) : a.status === 'pending' ? -1 : 1));
  }

  /** A pending task with the same title created in the last two minutes, if any. */
  recentDuplicate(title: string, windowMs = 120_000): Task | null {
    const wanted = title.trim().toLowerCase();
    const cutoff = this.clock() - windowMs;
    return (
      this.repo
        .listByStatus(['pending'])
        .find((t) => t.createdAt >= cutoff && t.title.trim().toLowerCase() === wanted) ?? null
    );
  }

  create(input: TaskInput): Task {
    const now = this.clock();
    const task = this.repo.insert(
      {
        title: input.title.trim(),
        notes: input.notes ?? '',
        priority: input.priority ?? 0,
        dueAt: input.dueAt ?? null,
      },
      now,
    );
    this.repo.logEvent(task.id, 'created', task.title, now);
    this.changed();
    return task;
  }

  update(id: number, patch: TaskPatch): Task {
    const existing = this.require(id);
    const task = this.repo.update(existing.id, patch, this.clock());
    this.repo.logEvent(id, 'edited', task.title, this.clock());
    this.changed();
    return task;
  }

  complete(id: number): Task {
    const existing = this.require(id);
    if (existing.status === 'done') return existing;
    const now = this.clock();
    const task = this.repo.update(id, { status: 'done', completedAt: now }, now);
    this.repo.logEvent(id, 'completed', task.title, now);
    this.changed();
    return task;
  }

  reopen(id: number): Task {
    this.require(id);
    const now = this.clock();
    const task = this.repo.update(id, { status: 'pending', completedAt: null }, now);
    this.repo.logEvent(id, 'reopened', task.title, now);
    this.changed();
    return task;
  }

  remove(id: number): Task {
    this.require(id);
    const now = this.clock();
    const task = this.repo.update(id, { status: 'removed' }, now);
    this.repo.logEvent(id, 'removed', task.title, now);
    this.changed();
    return task;
  }

  /** Adds a line to the notes without losing what is already there. */
  appendNote(id: number, text: string): Task {
    const existing = this.require(id);
    const joined = existing.notes ? `${existing.notes}\n${text}` : text;
    const task = this.repo.update(id, { notes: joined.slice(0, 2000) }, this.clock());
    this.repo.logEvent(id, 'edited', task.title, this.clock());
    this.changed();
    return task;
  }

  addAttachment(id: number, file: string): Task {
    const existing = this.require(id);
    const now = this.clock();
    this.repo.addAttachment(existing.id, file, now);
    this.repo.logEvent(id, 'edited', existing.title, now);
    this.changed();
    return this.require(id);
  }

  /** Returns the removed file name so the caller can delete it from disk. */
  removeAttachment(id: number, attachmentId: number): { task: Task; file: string | null } {
    this.require(id);
    const file = this.repo.removeAttachment(id, attachmentId);
    this.changed();
    return { task: this.require(id), file };
  }

  activityBetween(from: number, to: number): DayActivity {
    const events = this.repo.eventsBetween(from, to);
    const latestByTask = <T extends TaskEvent['type']>(type: T): TaskEvent[] => {
      const map = new Map<number, TaskEvent>();
      for (const e of events) if (e.type === type) map.set(e.taskId, e);
      return [...map.values()];
    };
    return {
      created: latestByTask('created'),
      completed: latestByTask('completed'),
      removed: latestByTask('removed'),
    };
  }

  private require(id: number): Task {
    const task = this.repo.get(id);
    if (!task || task.status === 'removed') throw new NotFoundError('That task');
    return task;
  }

  private changed(): void {
    this.broadcaster.emit('tasks:changed', this.list('all'));
  }
}
