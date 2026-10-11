import { memo } from 'react';
import type { Color, Square } from '../../rules/types';
import { cellStyle, displaySquares, isLightSquare } from './cells';

interface SquaresLayerProps {
  orientation: Color;
  lastMove: { from: Square; to: Square } | null;
  checkedKing: Square | null;
  selected: Square | null;
}

export const SquaresLayer = memo(function SquaresLayer({ orientation, lastMove, checkedKing, selected }: SquaresLayerProps) {
  return (
    <div className="board-layer">
      {displaySquares(orientation).map((square) => (
        <div
          key={square}
          data-square={square}
          className={`board-cell ${isLightSquare(square) ? 'square--light' : 'square--dark'}`}
          style={cellStyle(square, orientation)}
        >
          {(square === lastMove?.from || square === lastMove?.to) && <div className="overlay overlay--last-move" />}
          {square === checkedKing && <div className="overlay overlay--check" data-testid="check" />}
          {square === selected && <div className="overlay overlay--selected" data-testid="selected" />}
        </div>
      ))}
    </div>
  );
});
