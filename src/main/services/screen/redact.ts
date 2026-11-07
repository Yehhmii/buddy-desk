/** Removes secrets from OCR text before it leaves the machine. Pure and unit tested. */

const PLACEHOLDER = '[hidden]';

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

const RULES: Array<{ pattern: RegExp; replace: string | ((m: string) => string) }> = [
  {
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replace: PLACEHOLDER,
  },
  { pattern: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, replace: PLACEHOLDER },
  { pattern: /\b(?:gsk_|sk-|ghp_|gho_|xox[baprs]-|AIza|AKIA)[A-Za-z0-9_-]{16,}\b/g, replace: PLACEHOLDER },
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, replace: `Bearer ${PLACEHOLDER}` },
  {
    pattern: /\b(pass(?:word|wd)?|pwd|secret|token|api[_ -]?key|pin)\b(\s*[:=]\s*)\S+/gi,
    replace: (m) => m.replace(/(\s*[:=]\s*)\S+$/, `$1${PLACEHOLDER}`),
  },
  {
    pattern: /\b\d(?:[ -]?\d){12,18}\b/g,
    replace: (m) => {
      const digits = m.replace(/\D/g, '');
      return digits.length >= 13 && digits.length <= 19 && luhnValid(digits) ? PLACEHOLDER : m;
    },
  },
];

export function redactSensitiveText(text: string): string {
  return RULES.reduce((acc, rule) => acc.replace(rule.pattern, rule.replace as string), text);
}
