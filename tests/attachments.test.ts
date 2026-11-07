import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '@main/db/database';
import { TaskRepository } from '@main/db/repositories/TaskRepository';
import { TaskService } from '@main/services/tasks/TaskService';

vi.mock('@main/core/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function setup() {
  const db = openDatabase(':memory:');
  const emitted: unknown[] = [];
  const service = new TaskService(
    new TaskRepository(db),
    { emit: (_e, p) => void emitted.push(p) },
    () => 1_000,
  );
  return { db, service, emitted };
}

describe('task attachments and notes', () => {
  it('migrates a fresh database to the latest version', () => {
    const { db } = setup();
    expect(Number(db.pragma('user_version', { simple: true }))).toBeGreaterThanOrEqual(2);
  });

  it('attaches screenshots and returns them with the task', () => {
    const { service } = setup();
    const task = service.create({ title: 'Review layout' });
    expect(task.attachments).toEqual([]);

    service.addAttachment(task.id, 'shot-20261104-abc123.png');
    const after = service.addAttachment(task.id, 'shot-20261104-def456.png');
    expect(after.attachments.map((a) => a.file)).toEqual([
      'shot-20261104-abc123.png',
      'shot-20261104-def456.png',
    ]);
    expect(service.list('pending')[0]?.attachments).toHaveLength(2);
  });

  it('removes one attachment and reports which file to delete', () => {
    const { service } = setup();
    const task = service.create({ title: 'A' });
    const withShot = service.addAttachment(task.id, 'shot-20261104-abc123.png');
    const id = withShot.attachments[0]!.id;
    const result = service.removeAttachment(task.id, id);
    expect(result.file).toBe('shot-20261104-abc123.png');
    expect(result.task.attachments).toEqual([]);
    expect(service.removeAttachment(task.id, id).file).toBeNull();
  });

  it('appends notes instead of replacing them', () => {
    const { service } = setup();
    const task = service.create({ title: 'A', notes: 'first' });
    expect(service.appendNote(task.id, 'second').notes).toBe('first\nsecond');
    expect(service.appendNote(service.create({ title: 'B' }).id, 'only').notes).toBe('only');
  });
});
