import { useEffect } from 'react';
import type { Attachment, Task } from '@shared/types';
import Button from '@/components/ui/Button';
import { shotUrl } from './TaskRow';

interface ScreenshotViewerProps {
  task: Task;
  attachment: Attachment;
  onClose: () => void;
  onRemove: () => void;
}

export default function ScreenshotViewer({ task, attachment, onClose, onRemove }: ScreenshotViewerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label="Screenshot"
      className="no-drag fixed inset-0 z-40 grid place-items-center bg-black/45 p-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-full max-w-5xl flex-col gap-4 rounded-[24px] bg-surface p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={shotUrl(attachment.file)}
          alt={`Screenshot for ${task.title}`}
          className="min-h-0 flex-1 rounded-[14px] object-contain"
        />
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-[14px] text-mute">
            {task.title},{' '}
            {new Date(attachment.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={() => void window.api.screenshots.reveal(attachment.file)}>
              Show in folder
            </Button>
            <Button size="sm" variant="danger" onClick={onRemove}>
              Delete
            </Button>
            <Button size="sm" variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
