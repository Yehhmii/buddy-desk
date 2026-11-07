import { describe, expect, it } from 'vitest';
import type { Task } from '@shared/types';
import { resolveTaskRef } from '@main/services/tasks/taskMatch';

const task = (id: number, title: string): Task => ({
  id,
  title,
  notes: '',
  status: 'pending',
  priority: 0,
  dueAt: null,
  createdAt: id,
  updatedAt: id,
  completedAt: null,
  attachments: [],
});

const tasks = [
  task(1, 'Finish the invoice'),
  task(2, 'Call the landlord'),
  task(3, 'Send invoice reminder'),
  task(4, 'Gym session'),
];

describe('resolveTaskRef', () => {
  it('resolves ids', () => {
    expect(resolveTaskRef('#2', tasks)).toMatchObject({ kind: 'one', task: { id: 2 } });
    expect(resolveTaskRef(4, tasks)).toMatchObject({ kind: 'one', task: { id: 4 } });
  });

  it('resolves loose titles', () => {
    expect(resolveTaskRef('landlord', tasks)).toMatchObject({ kind: 'one', task: { id: 2 } });
    expect(resolveTaskRef('the gym task', tasks)).toMatchObject({ kind: 'one', task: { id: 4 } });
  });

  it('reports ambiguity instead of guessing', () => {
    const match = resolveTaskRef('invoice', tasks);
    expect(match.kind).toBe('many');
  });

  it('reports no match', () => {
    expect(resolveTaskRef('dentist', tasks).kind).toBe('none');
  });
});
