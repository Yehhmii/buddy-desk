const MODIFIERS = new Set(['Control', 'Ctrl', 'Alt', 'Shift', 'Super', 'CommandOrControl', 'CmdOrCtrl']);
const NAMED_KEYS = new Set([
  'Space',
  'Tab',
  'Enter',
  'Backspace',
  'Delete',
  'Insert',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Up',
  'Down',
  'Left',
  'Right',
  'Escape',
  'Plus',
]);

function isKeyToken(token: string): boolean {
  return /^[A-Z0-9]$/.test(token) || /^F([1-9]|1\d|2[0-4])$/.test(token) || NAMED_KEYS.has(token);
}

/** Validates an Electron accelerator: at least one modifier plus exactly one key. */
export function isValidAccelerator(value: string): boolean {
  const parts = value.split('+');
  if (parts.length < 2 || parts.length > 4) return false;
  const key = parts[parts.length - 1] ?? '';
  const mods = parts.slice(0, -1);
  return mods.every((m) => MODIFIERS.has(m)) && new Set(mods).size === mods.length && isKeyToken(key);
}
