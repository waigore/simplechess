import type { Color, Piece, Square } from '../../rules/types';
import { cellStyle } from './cells';
import { pieceKey, pieceUrl } from './pieceAssets';

export interface Ghost {
  piece: Piece;
  square: Square;
}

interface GhostsLayerProps {
  orientation: Color;
  ghosts: readonly Ghost[];
}

/** Captured pieces fading out while a move lands; removed when the tween batch settles. */
export function GhostsLayer({ orientation, ghosts }: GhostsLayerProps) {
  return (
    <div className="board-layer">
      {ghosts.map(({ piece, square }) => (
        <div
          key={square}
          data-ghost={square}
          data-kind={pieceKey(piece)}
          className="board-cell piece"
          style={{ ...cellStyle(square, orientation), backgroundImage: `url("${pieceUrl(piece)}")` }}
        />
      ))}
    </div>
  );
}
