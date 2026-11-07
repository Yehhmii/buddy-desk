/** Strips markdown so the voice never reads out asterisks and backticks. */
export function toSpeakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'a link')
    .replace(/^[#>\-*\d.\s]+(?=\S)/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Splits into sentences so the first one can start playing while the rest are still being generated. */
export function splitSentences(text: string, maxLen = 280): string[] {
  const raw = text.match(/[^.!?\n]+[.!?]*/g) ?? [text];
  const out: string[] = [];
  let buffer = '';
  for (const piece of raw.map((s) => s.trim()).filter(Boolean)) {
    if ((buffer + ' ' + piece).trim().length > maxLen && buffer) {
      out.push(buffer);
      buffer = piece;
    } else {
      buffer = (buffer + ' ' + piece).trim();
    }
  }
  if (buffer) out.push(buffer);
  return out.flatMap((s) =>
    s.length > maxLen ? (s.match(new RegExp(`.{1,${maxLen}}(\\s|$)`, 'g')) ?? [s]).map((p) => p.trim()) : [s],
  );
}
