import { describe, expect, it } from 'vitest';
import type { Task } from '@shared/types';
import { composeBriefing } from '@main/services/briefing/BriefingService';
import { buildReportMarkdown, fallbackNarrative } from '@main/services/reports/reportMarkdown';
import { renderReportHtml } from '@main/services/reports/ReportPdfExporter';

const task = (id: number, title: string, priority: 0 | 1 = 0): Task => ({
  id,
  title,
  notes: '',
  status: 'pending',
  priority,
  dueAt: null,
  createdAt: id,
  updatedAt: id,
  completedAt: null,
  attachments: [],
});

describe('composeBriefing', () => {
  const morning = new Date(2026, 10, 4, 8, 0).getTime();

  it('greets by name and lists top tasks, high priority first', () => {
    const b = composeBriefing({
      name: 'Ada',
      now: morning,
      pending: [task(1, 'Laundry'), task(2, 'Invoice', 1)],
      nextAlarm: null,
    });
    expect(b.greeting).toBe('Good morning, Ada');
    expect(b.spokenText).toContain('2 tasks pending');
    expect(b.highlights[0]?.title).toBe('Invoice');
  });

  it('handles an empty list', () => {
    expect(composeBriefing({ name: '', now: morning, pending: [], nextAlarm: null }).spokenText).toContain(
      'nothing pending',
    );
  });
});

describe('report', () => {
  it('builds markdown from facts', () => {
    const md = buildReportMarkdown({
      dateLabel: 'Wednesday',
      userName: '',
      completed: ['A'],
      added: [],
      removed: [],
      pending: [task(1, 'B', 1)],
      carriedOver: [],
      narrative: 'Good day.',
    });
    expect(md).toContain('## Finished today (1)');
    expect(md).toContain('B (high priority)');
  });

  it('has a fallback narrative', () => {
    expect(fallbackNarrative(0, 0)).toMatch(/No tasks/);
    expect(fallbackNarrative(2, 1)).toContain('2 tasks');
  });

  it('escapes raw html when rendering the PDF source', () => {
    const html = renderReportHtml('- <script>alert(1)</script>');
    expect(html).not.toContain('<script>alert');
  });
});
