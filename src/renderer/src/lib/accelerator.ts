/** Turns a keydown into an Electron accelerator string, or null while only modifiers are held. */
export function keyEventToAccelerator(e: KeyboardEvent | React.KeyboardEvent): string | null {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push('Control');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');

  const key = normalizeKey(e.code, e.key);
  if (!key || mods.length === 0) return null;
  return [...mods, key].join('+');
}

function normalizeKey(code: string, key: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) return code;
  const named: Record<string, string> = {
    Space: 'Space',
    Enter: 'Enter',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Escape: 'Escape',
  };
  return named[code] ?? (key.length === 1 && /[A-Za-z0-9]/.test(key) ? key.toUpperCase() : null);
}

export function prettyAccelerator(value: string): string {
  const mac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
  return value
    .replace(/Control/g, 'Ctrl')
    .replace(/Super/g, mac ? 'Cmd' : 'Win')
    .replace(/\+/g, ' + ');
}
