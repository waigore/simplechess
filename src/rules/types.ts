export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PromotionPiece = 'q' | 'n' | 'r' | 'b';
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Square = `${File}${Rank}`;

export interface Piece {
  color: Color;
  type: PieceType;
}

export interface MoveInput {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

/** One legal destination for a selected piece. */
export interface MoveOption {
  to: Square;
  /** True for en passant too: the empty en passant square still gets a ring marker. */
  capture: boolean;
  /** The promotion picker is needed. */
  promotion: boolean;
}

/** What the move list and motion need about a played move. */
export interface MoveDetail {
  color: Color;
  from: Square;
  to: Square;
  piece: PieceType;
  san: string;
  /** `square` differs from `to` for en passant. */
  captured?: { piece: Piece; square: Square };
  rook?: { from: Square; to: Square };
  promotion?: PromotionPiece;
}

export type RulesOutcome =
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'stalemate' | 'threefold' | 'fiftyMove' | 'insufficientMaterial' };

export interface PositionView {
  fen: string;
  board: ReadonlyMap<Square, Piece>;
  turn: Color;
  inCheck: boolean;
  checkedKing: Square | null;
  /** Only squares with at least one legal move; empty when the game is over. */
  legal: ReadonlyMap<Square, readonly MoveOption[]>;
  halfmoveClock: number;
  outcome: RulesOutcome | null;
}

export const FILES: readonly File[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8];

export function opponent(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}
