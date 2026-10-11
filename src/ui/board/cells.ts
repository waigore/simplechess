import type { CSSProperties } from 'react';
import { cellSquare, squareCell } from '../../interaction/geometry';
import { FILES } from '../../rules/types';
import type { Color, Square } from '../../rules/types';

/** Absolute position of a square, in board percentages. */
export function cellStyle(square: Square, orientation: Color): CSSProperties {
  const { col, row } = squareCell(square, orientation);
  return { left: `${col * 12.5}%`, top: `${row * 12.5}%` };
}

export function isLightSquare(square: Square): boolean {
  const file = FILES.indexOf(square[0] as (typeof FILES)[number]);
  return (file + Number(square[1])) % 2 === 0;
}

/** All 64 squares in display order: top-left to bottom-right as shown. */
export function displaySquares(orientation: Color): Square[] {
  const squares: Square[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) squares.push(cellSquare({ col, row }, orientation) as Square);
  }
  return squares;
}
