import { describe, expect, it } from 'vitest';
import { cellSquare, squareAt, squareCell } from './geometry';

const rect = { left: 100, top: 50, width: 400, height: 400 };

describe('squareCell', () => {
  it('puts a8 top-left and h1 bottom-right with White at the bottom', () => {
    expect(squareCell('a8', 'w')).toEqual({ col: 0, row: 0 });
    expect(squareCell('h1', 'w')).toEqual({ col: 7, row: 7 });
    expect(squareCell('e2', 'w')).toEqual({ col: 4, row: 6 });
  });

  it('puts h1 top-left and a8 bottom-right with Black at the bottom', () => {
    expect(squareCell('h1', 'b')).toEqual({ col: 0, row: 0 });
    expect(squareCell('a8', 'b')).toEqual({ col: 7, row: 7 });
    expect(squareCell('e2', 'b')).toEqual({ col: 3, row: 1 });
  });

  it('round-trips through cellSquare for every square and orientation', () => {
    for (const orientation of ['w', 'b'] as const) {
      for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 8; row++) {
          const square = cellSquare({ col, row }, orientation);
          expect(square).not.toBeNull();
          expect(squareCell(square!, orientation)).toEqual({ col, row });
        }
      }
    }
  });

  it('has no square outside the 8x8 grid', () => {
    expect(cellSquare({ col: -1, row: 0 }, 'w')).toBeNull();
    expect(cellSquare({ col: 0, row: 8 }, 'b')).toBeNull();
    expect(cellSquare({ col: 0.5, row: 0 }, 'w')).toBeNull();
  });
});

describe('squareAt', () => {
  it('maps points to squares for both orientations', () => {
    expect(squareAt({ x: 101, y: 51 }, rect, 'w')).toBe('a8');
    expect(squareAt({ x: 499, y: 449 }, rect, 'w')).toBe('h1');
    expect(squareAt({ x: 325, y: 375 }, rect, 'w')).toBe('e2');
    expect(squareAt({ x: 101, y: 51 }, rect, 'b')).toBe('h1');
    expect(squareAt({ x: 325, y: 375 }, rect, 'b')).toBe('d7');
  });

  it('includes the top-left edges and excludes the bottom-right edges', () => {
    expect(squareAt({ x: 100, y: 50 }, rect, 'w')).toBe('a8');
    expect(squareAt({ x: 150, y: 100 }, rect, 'w')).toBe('b7');
    expect(squareAt({ x: 500, y: 300 }, rect, 'w')).toBeNull();
    expect(squareAt({ x: 300, y: 450 }, rect, 'w')).toBeNull();
  });

  it('is null off the board', () => {
    expect(squareAt({ x: 99, y: 100 }, rect, 'w')).toBeNull();
    expect(squareAt({ x: 200, y: 49 }, rect, 'b')).toBeNull();
    expect(squareAt({ x: 900, y: 900 }, rect, 'w')).toBeNull();
  });
});
