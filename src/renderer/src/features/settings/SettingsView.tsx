import ViewFrame from '@/components/layout/ViewFrame';
import AppearanceSection from './sections/AppearanceSection';
import GeneralSection from './sections/GeneralSection';
import PrivacySection from './sections/PrivacySection';
import ProvidersSection from './sections/ProvidersSection';
import ReportSection from './sections/ReportSection';
import VoiceSection from './sections/VoiceSection';
import WakeWordSection from './sections/WakeWordSection';

export default function SettingsView() {
  return (
    <ViewFrame title="Settings">
      <div className="max-w-2xl">
        <AppearanceSection />
        <WakeWordSection />
        <VoiceSection />
        <ProvidersSection />
        <PrivacySection />
        <ReportSection />
        <GeneralSection />
      </div>
    </ViewFrame>
  );
}
