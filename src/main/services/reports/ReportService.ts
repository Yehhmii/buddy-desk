import { endOfLocalDay, localDateKey, startOfLocalDay } from '@shared/time';
import type { DailyReport } from '@shared/types';
import type { ReportRepository } from '../../db/repositories/ReportRepository';
import type { LlmRouter } from '../ai/LlmRouter';
import type { SettingsService } from '../settings/SettingsService';
import type { TaskService } from '../tasks/TaskService';
import { logger } from '../../core/logger';
import { buildReportMarkdown, fallbackNarrative } from './reportMarkdown';

const NARRATIVE_PROMPT =
  'You write the opening paragraph of an end-of-day report for one person. Use 2 to 4 plain sentences, ' +
  'second person, no headings, no lists, no emoji. Mention what got done, what is still open, and one ' +
  'suggestion for tomorrow if it helps. Use only the facts given. Never invent tasks.';

export class ReportService {
  constructor(
    private readonly repo: ReportRepository,
    private readonly tasks: TaskService,
    private readonly router: LlmRouter,
    private readonly settings: SettingsService,
    private readonly clock: () => number = Date.now,
  ) {}

  latest(): DailyReport | null {
    return this.repo.latest();
  }

  hasReportFor(date: string): boolean {
    return this.repo.byDate(date) !== null;
  }

  async generate(): Promise<DailyReport> {
    const now = this.clock();
    const dayStart = startOfLocalDay(now);
    const activity = this.tasks.activityBetween(dayStart, endOfLocalDay(now));
    const pending = this.tasks.list('pending');
    const carriedOver = pending.filter((t) => t.createdAt < dayStart);
    const completed = activity.completed.map((e) => e.title);

    const narrative = await this.narrate({
      completed,
      pending: pending.map((t) => t.title),
      carriedOver: carriedOver.map((t) => t.title),
    });

    const markdown = buildReportMarkdown({
      dateLabel: new Date(now).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
      userName: this.settings.get().general.userName,
      completed,
      added: activity.created.map((e) => e.title),
      removed: activity.removed.map((e) => e.title),
      pending,
      carriedOver,
      narrative,
    });
    return this.repo.upsert(localDateKey(now), markdown, now);
  }

  private async narrate(facts: {
    completed: string[];
    pending: string[];
    carriedOver: string[];
  }): Promise<string> {
    const fallback = fallbackNarrative(facts.completed.length, facts.pending.length);
    if (!this.router.hasAnyProvider() || (facts.completed.length === 0 && facts.pending.length === 0))
      return fallback;
    try {
      const res = await this.router.chat({
        messages: [
          { role: 'system', content: NARRATIVE_PROMPT },
          { role: 'user', content: JSON.stringify(facts) },
        ],
        temperature: 0.4,
        maxTokens: 250,
      });
      return res.content?.trim() || fallback;
    } catch (error) {
      logger.warn('Report narrative fell back to template', error);
      return fallback;
    }
  }
}
