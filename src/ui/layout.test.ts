import { describe, expect, it } from 'vitest';
import { BREAKPOINT, computeLayout } from './layout';

describe('computeLayout', () => {
  it.each([
    [1440, 900, 'wide', 864],
    [390, 844, 'narrow', 368],
    [860, 900, 'wide', 488],
    [859, 900, 'narrow', 640],
    [2560, 1440, 'wide', 960],
    [375, 667, 'narrow', 352],
  ] as const)('%i×%i → %s %i (playtest viewports)', (vw, vh, mode, boardSize) => {
    expect(computeLayout(vw, vh)).toEqual({ mode, boardSize });
  });

  it('switches mode exactly at the breakpoint', () => {
    expect(computeLayout(BREAKPOINT, 900).mode).toBe('wide');
    expect(computeLayout(BREAKPOINT - 1, 900).mode).toBe('narrow');
  });

  it('always yields a non-negative multiple of 8', () => {
    for (const [vw, vh] of [[1001, 777], [861, 33], [20, 20], [5, 5]] as const) {
      const { boardSize } = computeLayout(vw, vh);
      expect(boardSize % 8).toBe(0);
      expect(boardSize).toBeGreaterThanOrEqual(0);
    }
  });
});
