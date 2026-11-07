import log from 'electron-log/main';

const SECRET_PATTERNS: RegExp[] = [
  /gsk_[A-Za-z0-9]{20,}/g,
  /AIza[0-9A-Za-z_-]{30,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi,
];

export function scrub(text: string): string {
  return SECRET_PATTERNS.reduce((acc, re) => acc.replace(re, '[redacted]'), text);
}

log.initialize();
log.transports.file.maxSize = 2 * 1024 * 1024;
log.hooks.push((message) => ({
  ...message,
  data: message.data.map((d) =>
    typeof d === 'string' ? scrub(d) : d instanceof Error ? scrub(d.message) : d,
  ),
}));

export const logger = log.scope('buddy');
