import type { DailyReport } from '@shared/types';
import type { Db } from '../database';

interface ReportRow {
  id: number;
  date: string;
  markdown: string;
  created_at: number;
}

const toReport = (r: ReportRow): DailyReport => ({
  id: r.id,
  date: r.date,
  markdown: r.markdown,
  createdAt: r.created_at,
});

export class ReportRepository {
  constructor(private readonly db: Db) {}

  upsert(date: string, markdown: string, now: number): DailyReport {
    this.db
      .prepare(
        'INSERT INTO reports (date, markdown, created_at) VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET markdown = excluded.markdown, created_at = excluded.created_at',
      )
      .run(date, markdown, now);
    const row = this.db.prepare('SELECT * FROM reports WHERE date = ?').get(date) as ReportRow;
    return toReport(row);
  }

  latest(): DailyReport | null {
    const row = this.db.prepare('SELECT * FROM reports ORDER BY date DESC LIMIT 1').get() as
      ReportRow | undefined;
    return row ? toReport(row) : null;
  }

  byDate(date: string): DailyReport | null {
    const row = this.db.prepare('SELECT * FROM reports WHERE date = ?').get(date) as ReportRow | undefined;
    return row ? toReport(row) : null;
  }
}
