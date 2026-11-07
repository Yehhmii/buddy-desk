import { useState } from 'react';
import { SHOTS_PROTOCOL } from '@shared/constants';
import type { Attachment, Task } from '@shared/types';
import { cn } from '@/lib/cn';
import { describeDue } from '@/lib/format';
import Icon from '@/components/ui/Icon';

interface TaskRowProps {
  task: Task;
  onToggle: (task: Task) => void;
  onRename: (task: Task, title: string) => void;
  onNotes: (task: Task, notes: string) => void;
  onPriority: (task: Task) => void;
  onRemove: (task: Task) => void;
  onScreenshot: (task: Task) => void;
  onOpenShot: (task: Task, attachment: Attachment) => void;
}

export const shotUrl = (file: string): string => `${SHOTS_PROTOCOL}://img/${file}`;

export default function TaskRow({
  task,
  onToggle,
  onRename,
  onNotes,
  onPriority,
  onRemove,
  onScreenshot,
  onOpenShot,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(task.notes);
  const done = task.status === 'done';
  const overdue = !done && task.dueAt !== null && task.dueAt < Date.now();

  const commit = (): void => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== task.title) onRename(task, next);
    else setDraft(task.title);
  };

  const commitNotes = (): void => {
    setEditingNotes(false);
    if (notesDraft.trim() !== task.notes.trim()) onNotes(task, notesDraft.trim());
  };

  return (
    <li className="group flex items-start gap-4 border-b border-line py-3.5">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={done ? `Mark "${task.title}" as pending` : `Complete "${task.title}"`}
        className={cn(
          'no-drag mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border transition',
          done
            ? 'border-accent bg-accent text-white'
            : 'border-mute/50 text-transparent hover:border-accent hover:text-accent/50',
        )}
      >
        <Icon name="check" size={13} strokeWidth={2.4} />
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft(task.title);
                setEditing(false);
              }
            }}
            className="no-drag w-full bg-transparent text-[16px] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => !done && setEditing(true)}
            className={cn(
              'no-drag block max-w-full truncate text-left text-[16px] transition',
              done && 'text-mute line-through',
            )}
          >
            {task.title}
          </button>
        )}

        {(task.dueAt !== null || task.priority === 1) && !done && (
          <p className="mt-0.5 flex items-center gap-2 text-[13px] text-mute">
            {task.priority === 1 && <span className="font-medium text-accent">High priority</span>}
            {task.dueAt !== null && (
              <span className={cn(overdue && 'text-danger')}>{describeDue(task.dueAt)}</span>
            )}
          </p>
        )}

        {editingNotes ? (
          <textarea
            autoFocus
            value={notesDraft}
            maxLength={2000}
            rows={3}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={commitNotes}
            onKeyDown={(e) => e.key === 'Escape' && (setNotesDraft(task.notes), setEditingNotes(false))}
            className="no-drag mt-1.5 w-full resize-none rounded-control bg-fill px-3 py-2 text-[13px] leading-snug outline-none focus:ring-2 focus:ring-accent/40"
            aria-label="Notes"
          />
        ) : task.notes ? (
          <button
            type="button"
            onClick={() => (setNotesDraft(task.notes), setEditingNotes(true))}
            className="no-drag mt-0.5 block max-w-full text-left text-[13px] leading-snug whitespace-pre-line text-mute line-clamp-3 hover:text-ink"
          >
            {task.notes}
          </button>
        ) : (
          !done && (
            <button
              type="button"
              onClick={() => (setNotesDraft(''), setEditingNotes(true))}
              className="no-drag mt-0.5 hidden text-[12px] text-mute group-hover:block hover:text-ink focus-visible:block"
            >
              Add a note
            </button>
          )
        )}

        {task.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {task.attachments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onOpenShot(task, a)}
                aria-label="Open screenshot"
                className="no-drag overflow-hidden rounded-[10px] ring-1 ring-line transition hover:ring-accent"
              >
                <img
                  src={shotUrl(a.file)}
                  alt="Screenshot"
                  className="h-14 w-24 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {!done && (
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onScreenshot(task)}
            aria-label={`Attach a screenshot to "${task.title}"`}
            title="Attach a screenshot"
            className="no-drag grid size-7 place-items-center rounded-full text-mute hover:text-accent"
          >
            <Icon name="camera" size={16} />
          </button>
          <button
            type="button"
            onClick={() => onPriority(task)}
            className={cn(
              'no-drag rounded-full px-2.5 py-1 text-[12px] font-medium',
              task.priority === 1 ? 'bg-accent-soft text-accent' : 'text-mute hover:text-ink',
            )}
          >
            {task.priority === 1 ? 'High' : 'Flag'}
          </button>
          <button
            type="button"
            onClick={() => onRemove(task)}
            aria-label={`Remove "${task.title}"`}
            className="no-drag grid size-7 place-items-center rounded-full text-mute hover:text-danger"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      )}
    </li>
  );
}
