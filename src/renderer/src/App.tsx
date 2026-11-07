import AlarmRingOverlay from '@/features/alarms/AlarmRingOverlay';
import AlarmsView from '@/features/alarms/AlarmsView';
import ReportView from '@/features/report/ReportView';
import SettingsView from '@/features/settings/SettingsView';
import TodayView from '@/features/today/TodayView';
import { VoiceProvider } from '@/features/voice/VoiceProvider';
import Sidebar from '@/components/layout/Sidebar';
import TitleBar from '@/components/layout/TitleBar';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import OnboardingView from '@/features/onboarding/OnboardingView';
import { useEffect, useState } from 'react';

function Shell() {
  useAppBootstrap();
  const view = useUiStore((s) => s.view);
  const ready = useSettingsStore((s) => s.settings !== null);
  const onboarded = useSettingsStore((s) => s.settings?.general.onboarded ?? true);
  const [showGuide, setShowGuide] = useState<boolean | null>(null);

  // People who already had keys before the guide existed skip it. Everyone else sees it once.
  useEffect(() => {
    if (!ready || showGuide !== null) return;
    void window.api.secrets.status().then((s) => {
      const anyKey =
        s.groq.configured || s.gemini.configured || s.openai.configured || s.anthropic.configured;
      if (onboarded) setShowGuide(false);
      else if (anyKey) {
        void useSettingsStore.getState().update({ general: { onboarded: true } });
        setShowGuide(false);
      } else setShowGuide(true);
    });
  }, [ready, onboarded, showGuide]);

  if (ready && showGuide) {
    return (
      <div className="flex h-full">
        <TitleBar />
        <main className="min-w-0 flex-1">
          <OnboardingView onDone={() => setShowGuide(false)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <TitleBar />
      <Sidebar />
      <main className="min-w-0 flex-1">
        {ready && view === 'today' && <TodayView />}
        {ready && view === 'alarms' && <AlarmsView />}
        {ready && view === 'report' && <ReportView />}
        {ready && view === 'settings' && <SettingsView />}
      </main>
      <AlarmRingOverlay />
    </div>
  );
}

export default function App() {
  return (
    <VoiceProvider>
      <Shell />
    </VoiceProvider>
  );
}
