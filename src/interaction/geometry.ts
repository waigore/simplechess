import { FILES, RANKS } from '../rules/types';
import type { Color, Square } from '../rules/types';

/** Client pixels. */
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Column and row of a square in square units from the top-left corner of the board as shown. */
export interface Cell {
  col: number;
  row: number;
}

/** `orientation` is the color at the bottom of the board. */
export function squareCell(square: Square, orientation: Color): Cell {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rank = Number(square[1]) - 1;
  return orientation === 'w' ? { col: file, row: 7 - rank } : { col: 7 - file, row: rank };
}

export function cellSquare({ col, row }: Cell, orientation: Color): Square | null {
  if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || col > 7 || row < 0 || row > 7) return null;
  const file = orientation === 'w' ? FILES[col] : FILES[7 - col];
  const rank = orientation === 'w' ? RANKS[7 - row] : RANKS[row];
  return file && rank ? `${file}${rank}` : null;
}

/** The square under a client point, or null when the point is off the board. */
export function squareAt(point: Point, rect: Rect, orientation: Color): Square | null {
  const dx = point.x - rect.left;
  const dy = point.y - rect.top;
  if (dx < 0 || dy < 0 || dx >= rect.width || dy >= rect.height) return null;
  const col = Math.floor((dx / rect.width) * 8);
  const row = Math.floor((dy / rect.height) * 8);
  return cellSquare({ col, row }, orientation);
}
