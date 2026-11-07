import lunaSvg from '../../assets/skins/luna.svg?raw';
import rexSvg from '../../assets/skins/rex.svg?raw';
import type { CharacterId } from '@shared/characters';

/** Vector skins: id -> bundled SVG markup. Frame-based skins (Buddy) and the Orb are handled in Character.tsx. */
export const SVG_SKINS: Partial<Record<CharacterId, string>> = {
  luna: lunaSvg,
  rex: rexSvg,
};
