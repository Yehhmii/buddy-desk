import { execFile } from 'node:child_process';

export interface ScriptResult {
  ok: boolean;
  message: string;
}

export type ScriptRunner = (script: string) => Promise<ScriptResult>;

/** Runs a script in Windows PowerShell. The script is passed encoded, so quoting can never break it. */
export const runPowerShell: ScriptRunner = (script) =>
  new Promise((resolve) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { timeout: 20_000, windowsHide: true },
      (error, _stdout, stderr) => {
        if (error) resolve({ ok: false, message: (stderr || error.message).trim().slice(0, 300) });
        else resolve({ ok: true, message: '' });
      },
    );
  });
