/**
 * Every character the user can pick. To add one, put its art under src/renderer/src/assets, register it
 * in renderer/src/features/voice/skins.ts, and add its id here (see docs/ADDING_SKINS.md).
 */
export const CHARACTERS = [
  { id: 'orb', name: 'Orb', blurb: 'A glowing sphere that pulses with your voice' },
  { id: 'buddy', name: 'Buddy', blurb: 'A friendly green sidekick' },
  { id: 'luna', name: 'Luna', blurb: 'Bright, bubbly and full of sparkle' },
  { id: 'rex', name: 'Rex', blurb: 'Laid-back, bearded and dependable' },
] as const;

export type CharacterId = (typeof CHARACTERS)[number]['id'];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id) as [CharacterId, ...CharacterId[]];
