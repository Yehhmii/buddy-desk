import { useMemo, useState } from 'react';
import { startOfLocalDay } from '@shared/time';
import { compareTasks } from '@shared/sort';
import type { Attachment, Task } from '@shared/types';
import { useTasksStore } from '@/stores/useTasksStore';
import { useUiStore } from '@/stores/useUiStore';
import ScreenshotViewer from './ScreenshotViewer';
import TaskComposer from './TaskComposer';
import TaskRow from './TaskRow';

export default function TaskList() {
  const tasks = useTasksStore((s) => s.tasks);
  const loaded = useTasksStore((s) => s.loaded);
  const [showDone, setShowDone] = useState(false);
  const [viewing, setViewing] = useState<{ taskId: number; attachment: Attachment } | null>(null);
  const notify = (text: string): void => useUiStore.getState().pushEntry({ role: 'notice', text });

  const { pending, doneToday } = useMemo(() => {
    const dayStart = startOfLocalDay(Date.now());
    return {
      pending: tasks.filter((t) => t.status === 'pending').sort(compareTasks),
      doneToday: tasks
        .filter((t) => t.status === 'done' && (t.completedAt ?? 0) >= dayStart)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    };
  }, [tasks]);

  const guard = (fn: () => Promise<unknown>) => (): void =>
    void fn().catch((e: unknown) => notify(e instanceof Error ? e.message : 'That did not work.'));

  const toggle = (t: Task): void =>
    guard(() => (t.status === 'done' ? window.api.tasks.reopen(t.id) : window.api.tasks.complete(t.id)))();
  const rename = (t: Task, title: string): void => guard(() => window.api.tasks.update(t.id, { title }))();
  const priority = (t: Task): void =>
    guard(() => window.api.tasks.update(t.id, { priority: t.priority === 1 ? 0 : 1 }))();
  const remove = (t: Task): void => guard(() => window.api.tasks.remove(t.id))();
  const notes = (t: Task, text: string): void =>
    guard(() => window.api.tasks.update(t.id, { notes: text }))();
  const shot = (t?: Task): void => guard(() => window.api.screenshots.capture(t ? { taskId: t.id } : {}))();
  const viewedTask = viewing ? tasks.find((t) => t.id === viewing.taskId) : undefined;

  return (
    <div>
      <TaskComposer
        onAdd={async (title) => void (await window.api.tasks.create({ title }))}
        onScreenshot={() => shot()}
      />
      <ul>
        {pending.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onToggle={toggle}
            onRename={rename}
            onNotes={notes}
            onPriority={priority}
            onRemove={remove}
            onScreenshot={shot}
            onOpenShot={(task, attachment) => setViewing({ taskId: task.id, attachment })}
          />
        ))}
      </ul>

      {loaded && pending.length === 0 && (
        <p className="py-10 text-[15px] text-mute">Nothing pending. Add a task above, or tell Jarvis.</p>
      )}

      {doneToday.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="no-drag text-[13px] font-medium text-mute hover:text-ink"
          >
            {showDone ? 'Hide' : 'Show'} finished today ({doneToday.length})
          </button>
          {showDone && (
            <ul>
              {doneToday.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={toggle}
                  onRename={rename}
                  onNotes={notes}
                  onPriority={priority}
                  onRemove={remove}
                  onScreenshot={shot}
                  onOpenShot={(task, attachment) => setViewing({ taskId: task.id, attachment })}
                />
              ))}
            </ul>
          )}
        </div>
      )}
      {viewing && viewedTask && (
        <ScreenshotViewer
          task={viewedTask}
          attachment={viewing.attachment}
          onClose={() => setViewing(null)}
          onRemove={() => {
            void window.api.screenshots
              .removeAttachment(viewedTask.id, viewing.attachment.id)
              .catch(() => undefined);
            setViewing(null);
          }}
        />
      )}
    </div>
  );
}
