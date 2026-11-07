const MAX_ITEMS = 6;

const plain = (s: string): string =>
  s
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function joinList(items: string[]): string {
  const shown = items.slice(0, MAX_ITEMS);
  const extra = items.length - shown.length;
  if (extra > 0) return `${shown.join(', ')}, and ${extra} more`;
  if (shown.length <= 1) return shown.join('');
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

/** Turns the markdown report into sentences that sound natural when read aloud. */
export function reportToSpeech(markdown: string): string {
  const lines = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const out: string[] = ['Here is your day report.'];
  let section: { title: string; items: string[] } | null = null;

  const flush = (): void => {
    if (!section) return;
    out.push(
      section.items.length === 0
        ? `${section.title}: nothing.`
        : `${section.title}: ${joinList(section.items)}.`,
    );
    section = null;
  };

  for (const line of lines) {
    if (/^#\s/.test(line)) continue; // the title is skipped, the opening sentence covers it
    if (/^##\s/.test(line)) {
      flush();
      section = { title: plain(line.replace(/^##\s+/, '').replace(/\s*\(\d+\)\s*$/, '')), items: [] };
    } else if (/^[-*]\s/.test(line)) {
      section?.items.push(plain(line.replace(/^[-*]\s+/, '')));
    } else if (/^_.*_$/.test(line)) {
      continue; // "Nothing was marked done today." style placeholders
    } else {
      out.push(plain(line).replace(/([^.!?])$/, '$1.'));
    }
  }
  flush();
  return out.join(' ');
}
