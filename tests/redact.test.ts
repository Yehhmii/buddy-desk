import { describe, expect, it } from 'vitest';
import { redactSensitiveText } from '@main/services/screen/redact';

describe('redactSensitiveText', () => {
  it('hides api keys and tokens', () => {
    const out = redactSensitiveText(
      'key gsk_abcdefghijklmnopqrstuvwx and Bearer abcdefghijklmnopqrstuvwxyz123',
    );
    expect(out).not.toContain('gsk_abc');
    expect(out).not.toContain('abcdefghijklmnopqrstuvwxyz123');
  });

  it('hides password assignments but keeps the label', () => {
    expect(redactSensitiveText('password: hunter2')).toBe('password: [hidden]');
  });

  it('hides valid card numbers only', () => {
    expect(redactSensitiveText('card 4111 1111 1111 1111 ok')).toBe('card [hidden] ok');
    expect(redactSensitiveText('order 1234 5678 9012 3456')).toContain('1234');
  });

  it('hides private key blocks', () => {
    const block = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----';
    expect(redactSensitiveText(`x ${block} y`)).toBe('x [hidden] y');
  });

  it('leaves normal text alone', () => {
    expect(redactSensitiveText('Meeting at 3pm with Sam')).toBe('Meeting at 3pm with Sam');
  });
});
