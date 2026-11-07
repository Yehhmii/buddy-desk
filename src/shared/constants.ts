export const APP_NAME = 'Jarvis Desk';
export const MODEL_PROTOCOL = 'buddy-models';
export const SHOTS_PROTOCOL = 'buddy-shots';
export const SHOT_FILE_PATTERN = /^shot-[A-Za-z0-9-]{8,60}\.png$/;
export const WAKE_MODEL_FILE = 'vosk-model-small-en-us-0.15.tar.gz';
export const WAKE_MODEL_URL = `${MODEL_PROTOCOL}://vosk/model.tar.gz`;

/** Hard limits applied at the IPC boundary. */
export const LIMITS = {
  taskTitle: 200,
  taskNotes: 2000,
  alarmLabel: 80,
  chatText: 2000,
  audioBytes: 8 * 1024 * 1024,
  ttsText: 600,
} as const;
