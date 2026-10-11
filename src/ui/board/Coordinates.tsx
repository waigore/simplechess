import { memo } from 'react';
import { cellSquare } from '../../interaction/geometry';
import type { Color, Square } from '../../rules/types';
import { cellStyle, isLightSquare } from './cells';

interface CoordinatesProps {
  orientation: Color;
}

function colorClass(square: Square): string {
  return isLightSquare(square) ? 'coord--on-light' : 'coord--on-dark';
}

/** Rank numbers down the left file and file letters along the bottom rank, as shown. */
export const Coordinates = memo(function Coordinates({ orientation }: CoordinatesProps) {
  const left = [0, 1, 2, 3, 4, 5, 6, 7].map((row) => cellSquare({ col: 0, row }, orientation) as Square);
  const bottom = [0, 1, 2, 3, 4, 5, 6, 7].map((col) => cellSquare({ col, row: 7 }, orientation) as Square);
  return (
    <div className="board-layer" aria-hidden="true">
      {left.map((square) => (
        <div key={`r${square}`} className="board-cell" style={cellStyle(square, orientation)}>
          <span className={`coord coord--rank ${colorClass(square)}`}>{square[1]}</span>
        </div>
      ))}
      {bottom.map((square) => (
        <div key={`f${square}`} className="board-cell" style={cellStyle(square, orientation)}>
          <span className={`coord coord--file ${colorClass(square)}`}>{square[0]}</span>
        </div>
      ))}
    </div>
  );
});
