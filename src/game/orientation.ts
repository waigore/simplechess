import type { Color } from '../rules/types';
import type { OrientationMode } from './types';

/** The color shown at the bottom of the board. */
export function boardOrientation(mode: OrientationMode, sideToMove: Color): Color {
  return mode === 'whiteBottom' ? 'w' : sideToMove;
}
