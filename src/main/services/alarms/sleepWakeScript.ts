/** Builds the PowerShell that manages the single Windows wake timer. Pure, so it can be tested anywhere. */

export const WAKE_TASK_NAME = 'JarvisDeskAlarmWake';

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`;

function localStamp(ts: number): string {
  const d = new Date(ts);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function buildRegisterScript(exe: string, args: string, at: number): string {
  return [
    "$ErrorActionPreference = 'Stop'",
    `$at = [datetime]::ParseExact(${quote(localStamp(at))}, 'yyyy-MM-ddTHH:mm:ss', [Globalization.CultureInfo]::InvariantCulture)`,
    `$action = New-ScheduledTaskAction -Execute ${quote(exe)} -Argument ${quote(args)}`,
    '$trigger = New-ScheduledTaskTrigger -Once -At $at',
    '$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 15)',
    '$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name',
    '$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited',
    `Register-ScheduledTask -TaskName ${quote(WAKE_TASK_NAME)} -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Wakes this PC for a Jarvis Desk alarm' -Force | Out-Null`,
  ].join('\n');
}

export function buildUnregisterScript(): string {
  return `Unregister-ScheduledTask -TaskName ${quote(WAKE_TASK_NAME)} -Confirm:$false -ErrorAction SilentlyContinue`;
}
