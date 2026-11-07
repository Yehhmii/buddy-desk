import { useState } from 'react';
import Markdown from 'react-markdown';
import Button from '@/components/ui/Button';
import ViewFrame from '@/components/layout/ViewFrame';
import { reportToSpeech } from '@shared/reportSpeech';
import { useVoice } from '@/features/voice/VoiceProvider';
import { useUiStore } from '@/stores/useUiStore';

export default function ReportView() {
  const voice = useVoice();
  const report = useUiStore((s) => s.report);
  const setReport = useUiStore((s) => s.setReport);
  const [busy, setBusy] = useState<'generate' | 'pdf' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (kind: 'generate' | 'pdf'): Promise<void> => {
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === 'generate') setReport(await window.api.report.generate());
      else {
        const path = await window.api.report.exportPdf();
        if (path) setMessage(`Saved to ${path}`);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <ViewFrame
      title="Day report"
      subtitle={
        report
          ? `Written ${new Date(report.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
          : 'A summary of what you did and what is still open.'
      }
      actions={
        <>
          <Button
            disabled={!report}
            onClick={() => report && void voice.say(reportToSpeech(report.markdown))}
          >
            Read aloud
          </Button>
          <Button disabled={busy !== null || !report} onClick={() => void run('pdf')}>
            {busy === 'pdf' ? 'Exporting' : 'Export PDF'}
          </Button>
          <Button variant="primary" disabled={busy !== null} onClick={() => void run('generate')}>
            {busy === 'generate' ? 'Writing' : report ? 'Refresh report' : 'Write report'}
          </Button>
        </>
      }
    >
      <div className="max-w-2xl">
        {message && <p className="mb-4 text-[13px] text-mute">{message}</p>}
        {report ? (
          <article className="space-y-4 text-[16px] leading-relaxed [&_em]:text-mute [&_h1]:hidden [&_h2]:mt-8 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_li]:py-1 [&_ul]:list-disc [&_ul]:pl-5">
            <Markdown>{report.markdown}</Markdown>
          </article>
        ) : (
          <p className="py-8 text-[15px] text-mute">
            No report yet. Jarvis writes one automatically at your end-of-day time, or you can write it now.
          </p>
        )}
      </div>
    </ViewFrame>
  );
}
