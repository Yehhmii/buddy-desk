import type { Task } from './types';

/** High priority first, then earliest due date, then oldest first. */
export function compareTasks(a: Task, b: Task): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  const aDue = a.dueAt ?? Number.POSITIVE_INFINITY;
  const bDue = b.dueAt ?? Number.POSITIVE_INFINITY;
  if (aDue !== bDue) return aDue - bDue;
  return a.createdAt - b.createdAt;
}
