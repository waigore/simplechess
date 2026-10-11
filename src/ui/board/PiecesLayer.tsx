import type { Color, Piece, Square } from '../../rules/types';
import { cellStyle } from './cells';
import { pieceKey, pieceUrl } from './pieceAssets';

interface PiecesLayerProps {
  orientation: Color;
  board: ReadonlyMap<Square, Piece>;
  /** Pieces of this color show the grab cursor; null when nothing can be picked up. */
  grabbable: Color | null;
  /** The origin of a drag, shown as a faint ghost while the piece follows the pointer. */
  lifted: Square | null;
}

/** One element per occupied square, keyed by square so the animator can find the piece that just landed. */
export function PiecesLayer({ orientation, board, grabbable, lifted }: PiecesLayerProps) {
  return (
    <div className="board-layer">
      {[...board].map(([square, piece]) => {
        const classes = ['board-cell', 'piece'];
        if (piece.color === grabbable) classes.push('piece--grab');
        if (square === lifted) classes.push('piece--lifted');
        return (
          <div
            key={square}
            data-piece={square}
            data-kind={pieceKey(piece)}
            className={classes.join(' ')}
            style={{ ...cellStyle(square, orientation), backgroundImage: `url("${pieceUrl(piece)}")` }}
          />
        );
      })}
    </div>
  );
}
