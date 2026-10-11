import { describe, expect, it } from 'vitest';
import { defaultSetup, formFromSetup, resolveSetup } from './defaults';
import { moveRows } from './moveRows';
import { boardOrientation } from './orientation';

describe('defaults', () => {
  const form = (w: string, b: string) => ({ ...defaultSetup(), names: { w, b } });

  it('defaults to White/Black, untimed, side to move at the bottom', () => {
    expect(defaultSetup()).toEqual({
      names: { w: 'White', b: 'Black' },
      timeControl: { kind: 'untimed' },
      orientation: 'sideToMove',
    });
  });

  it('trims names, caps them at 24 characters, and fills blanks with the color', () => {
    expect(resolveSetup(form('  Alice ', '\tBob')).names).toEqual({ w: 'Alice', b: 'Bob' });
    expect(resolveSetup(form('   ', '')).names).toEqual({ w: 'White', b: 'Black' });
    expect(resolveSetup(form('x'.repeat(30), 'y')).names.w).toBe('x'.repeat(24));
  });

  it('pre-fills the form with custom names and leaves default names empty', () => {
    expect(formFromSetup({ ...defaultSetup(), names: { w: 'Alice', b: 'Black' }, orientation: 'whiteBottom' })).toEqual({
      names: { w: 'Alice', b: '' },
      timeControl: { kind: 'untimed' },
      orientation: 'whiteBottom',
    });
  });
});

describe('moveRows', () => {
  it('is empty for no moves', () => {
    expect(moveRows([])).toEqual([]);
  });

  it('groups odd and even lengths into numbered rows', () => {
    expect(moveRows(['e4'])).toEqual([{ number: 1, white: 'e4', black: null }]);
    expect(moveRows(['e4', 'e5', 'Nf3'])).toEqual([
      { number: 1, white: 'e4', black: 'e5' },
      { number: 2, white: 'Nf3', black: null },
    ]);
    expect(moveRows(['e4', 'e5', 'Nf3', 'Nc6'])).toHaveLength(2);
  });
});

describe('boardOrientation', () => {
  it('follows the side to move or keeps White at the bottom', () => {
    expect(boardOrientation('sideToMove', 'w')).toBe('w');
    expect(boardOrientation('sideToMove', 'b')).toBe('b');
    expect(boardOrientation('whiteBottom', 'b')).toBe('w');
  });
});
