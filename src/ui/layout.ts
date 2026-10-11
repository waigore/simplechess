export const BREAKPOINT = 860;

export type LayoutMode = 'wide' | 'narrow';

export interface Layout {
  mode: LayoutMode;
  /** Board side in px, a multiple of 8 so every square is a whole number of pixels. */
  boardSize: number;
}

const floor8 = (n: number) => Math.max(0, Math.floor(n / 8) * 8);

export function computeLayout(vw: number, vh: number): Layout {
  return vw >= BREAKPOINT
    ? { mode: 'wide', boardSize: floor8(Math.min(vh - 32, vw - 320 - 48, 960)) }
    : { mode: 'narrow', boardSize: floor8(Math.min(vw - 16, 640)) };
}
