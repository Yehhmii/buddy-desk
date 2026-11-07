import { useEffect } from 'react';
import { useAlarmsStore } from '@/stores/useAlarmsStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTasksStore } from '@/stores/useTasksStore';
import { useUiStore } from '@/stores/useUiStore';
import { useWakeStore } from '@/stores/useWakeStore';
import { useVoice } from '@/features/voice/VoiceProvider';

/** Loads initial data once and keeps the stores in sync with pushes from the main process. */
export function useAppBootstrap(): void {
  const voice = useVoice();

  useEffect(() => {
    const api = window.api;
    const ui = useUiStore.getState;
    const offs = [
      api.on('tasks:changed', (t) => useTasksStore.getState().apply(t)),
      api.on('alarms:changed', (a) => useAlarmsStore.getState().applyAlarms(a)),
      api.on('alarms:ring', (r) => useAlarmsStore.getState().addRinging(r)),
      api.on('alarms:stop', ({ id }) => useAlarmsStore.getState().removeRinging(id)),
      api.on('settings:changed', (s) => useSettingsStore.getState().apply(s)),
      api.on('report:ready', (r) => ui().setReport(r)),
      api.on('screen:changed', (s) => ui().setScreen(s)),
      api.on('wake:model-progress', (p) => useWakeStore.getState().setProgress(p)),
      api.on('app:navigate', (v) => ui().setView(v)),
      api.on('voice:toggle', () => voice.trigger('hotkey')),
      api.on('report:announce', (report) => {
        // If Jarvis is mid-conversation, ask again every few seconds until it is free.
        let tries = 0;
        const attempt = (): void => {
          void voice.offerReport(report).then((asked) => {
            if (!asked && ++tries < 120) setTimeout(attempt, 5_000);
          });
        };
        attempt();
      }),
    ];

    void (async () => {
      await Promise.all([
        useSettingsStore.getState().load(),
        useTasksStore.getState().load(),
        useAlarmsStore.getState().load(),
      ]);
      const [report, screen, model] = await Promise.all([
        api.report.latest(),
        api.screen.status(),
        api.wake.modelStatus(),
      ]);
      ui().setReport(report);
      ui().setScreen(screen);
      useWakeStore.getState().setModel(model);

      const settings = useSettingsStore.getState().settings;
      if (settings?.general.briefingOnLaunch) {
        const briefing = await api.briefing.get();
        ui().setBriefing(briefing);
        if (settings.general.speakBriefing) void voice.say(briefing.spokenText);
      }
    })().catch((e: unknown) =>
      ui().pushEntry({ role: 'notice', text: e instanceof Error ? e.message : 'Could not load your data.' }),
    );

    return () => offs.forEach((off) => off());
  }, [voice]);

  // Keep the greeting fresh when tasks or alarms change.
  const tasks = useTasksStore((s) => s.tasks);
  const alarms = useAlarmsStore((s) => s.alarms);
  useEffect(() => {
    if (!useUiStore.getState().briefing) return;
    void window.api.briefing
      .get()
      .then((b) => useUiStore.getState().setBriefing(b))
      .catch(() => undefined);
  }, [tasks, alarms]);
}
