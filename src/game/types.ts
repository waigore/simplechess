import type { Color, MoveDetail, MoveInput, PositionView, Square } from '../rules/types';

export type OrientationMode = 'sideToMove' | 'whiteBottom';
export type TimeControl = { kind: 'untimed' };

export interface Setup {
  /** Already trimmed; blanks resolved to "White" / "Black". */
  names: Record<Color, string>;
  timeControl: TimeControl;
  orientation: OrientationMode;
}

export type DrawOffer =
  | { state: 'none' }
  | { state: 'pending'; by: Color }
  /** Shown until the next move; blocks a re-offer by `by`. */
  | { state: 'declined'; by: Color };

export type Termination = { kind: 'resignation'; by: Color } | { kind: 'agreement' };

/** Serializable source of truth (plain JSON). */
export interface GameRecord {
  setup: Setup;
  moves: MoveInput[];
  /** App-level endings only; rules endings are derived from the position. */
  termination: Termination | null;
  drawOffer: DrawOffer;
}

export type EndReason =
  | 'checkmate'
  | 'resignation'
  | 'stalemate'
  | 'threefold'
  | 'fiftyMove'
  | 'insufficientMaterial'
  | 'agreement';

/** `winner` null = draw. */
export interface Result {
  winner: Color | null;
  reason: EndReason;
}

/** Immutable snapshot the UI renders from. */
export interface GameState {
  record: GameRecord;
  position: PositionView;
  /** One per `record.moves` entry. */
  history: readonly MoveDetail[];
  lastMove: { from: Square; to: Square } | null;
  result: Result | null;
  /** `history.length > 0 && result === null` */
  underway: boolean;
}
