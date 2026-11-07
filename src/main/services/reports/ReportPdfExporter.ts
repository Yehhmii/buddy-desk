import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import { Marked } from 'marked';
import type { DailyReport } from '@shared/types';
import { paths } from '../../config/paths';

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Raw HTML inside the markdown is escaped, not rendered. Task titles are user text.
const marked = new Marked({ renderer: { html: ({ text }) => escapeHtml(text) } });

const STYLE = `
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1d1d1f; margin: 0; line-height: 1.55; font-size: 12pt; }
  h1 { font-size: 24pt; letter-spacing: -0.02em; margin: 0 0 14pt; }
  h2 { font-size: 14pt; margin: 22pt 0 6pt; }
  ul { padding-left: 18pt; margin: 4pt 0; }
  p, li { margin: 3pt 0; } em { color: #6e6e73; }
`;

export function renderReportHtml(markdown: string): string {
  const body = marked.parse(markdown, { async: false });
  return `<!doctype html><html><head><meta charset="utf-8"><style>${STYLE}</style></head><body>${body}</body></html>`;
}

/** Renders the report in a hidden, script-less window and saves it as a PDF the user picks. */
export async function exportReportPdf(
  report: DailyReport,
  parent: BrowserWindow | null,
): Promise<string | null> {
  await mkdir(paths.reports(), { recursive: true });
  const options = {
    title: 'Save day report',
    defaultPath: join(paths.reports(), `report-${report.date}.pdf`),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  };
  const target = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options);
  if (target.canceled || !target.filePath) return null;

  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, javascript: false, contextIsolation: true, nodeIntegration: false },
  });
  try {
    await win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(renderReportHtml(report.markdown))}`,
    );
    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.8, bottom: 0.8, left: 0.8, right: 0.8 },
    });
    await writeFile(target.filePath, pdf);
    return target.filePath;
  } finally {
    win.destroy();
  }
}
