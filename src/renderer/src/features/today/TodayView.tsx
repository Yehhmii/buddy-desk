import { formatClockTime } from '@shared/time';
import AssistantPanel from '@/features/assistant/AssistantPanel';
import TaskList from '@/features/tasks/TaskList';
import SetupBanner from './SetupBanner';
import { useAlarmsStore } from '@/stores/useAlarmsStore';
import { useTasksStore } from '@/stores/useTasksStore';
import { useUiStore } from '@/stores/useUiStore';

export default function TodayView() {
  const briefing = useUiStore((s) => s.briefing);
  const pending = useTasksStore((s) => s.tasks.filter((t) => t.status === 'pending').length);
  const next = useAlarmsStore(
    (s) =>
      s.alarms
        .filter((a) => a.enabled && a.nextFireAt)
        .sort((a, b) => (a.nextFireAt ?? 0) - (b.nextFireAt ?? 0))[0],
  );

  const date = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const summary = [
    pending === 0 ? 'Nothing pending' : `${pending} ${pending === 1 ? 'task' : 'tasks'} pending`,
    next?.nextFireAt ? `next alarm ${formatClockTime(next.nextFireAt)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <section className="flex h-full min-w-0 flex-1 gap-10 px-10 pt-12 pb-8">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="pb-6">
          <h1 className="text-[40px] leading-tight font-semibold tracking-[-0.035em]">
            {briefing?.greeting ?? 'Hello'}
          </h1>
          <p className="mt-1 text-[15px] text-mute">
            {date}. {summary}.
          </p>
        </header>
        <div className="scroll-y min-h-0 flex-1 pr-2">
          <SetupBanner />
          <TaskList />
        </div>
      </div>
      <AssistantPanel />
    </section>
  );
}
