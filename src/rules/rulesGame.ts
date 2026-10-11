import { Chess, DEFAULT_POSITION, type Move } from 'chess.js';
import {
  opponent,
  type MoveDetail,
  type MoveInput,
  type MoveOption,
  type Piece,
  type PositionView,
  type RulesOutcome,
  type Square,
} from './types';

export const START_FEN: string = DEFAULT_POSITION;

const EMPTY_LEGAL: ReadonlyMap<Square, readonly MoveOption[]> = new Map();

export class RulesGame {
  private readonly chess: Chess;
  private cached: PositionView | null = null;

  private constructor(fen: string) {
    this.chess = new Chess(fen);
  }

  /** Throws only when `moves` is not a legal sequence from `startFen` (a corrupt record). */
  static replay(moves: readonly MoveInput[], startFen: string = START_FEN): RulesGame {
    const game = new RulesGame(startFen);
    moves.forEach((move, index) => {
      if (game.play(move) === null) {
        throw new Error(`Illegal move at ply ${index + 1}: ${move.from}-${move.to}`);
      }
    });
    return game;
  }

  /** Returns null for an illegal move and leaves the position unchanged. */
  play(input: MoveInput): MoveDetail | null {
    const option = this.view().legal.get(input.from)?.find((o) => o.to === input.to);
    if (!option || option.promotion !== (input.promotion !== undefined)) return null;

    const move = this.chess.move(
      input.promotion ? { from: input.from, to: input.to, promotion: input.promotion } : { from: input.from, to: input.to },
    );
    this.cached = null;
    return toDetail(move);
  }

  view(): PositionView {
    this.cached ??= this.buildView();
    return this.cached;
  }

  private buildView(): PositionView {
    const chess = this.chess;
    const fen = chess.fen();
    const turn = chess.turn();
    const board = new Map<Square, Piece>();
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell) board.set(cell.square, { color: cell.color, type: cell.type });
      }
    }

    const inCheck = chess.isCheck();
    let checkedKing: Square | null = null;
    if (inCheck) {
      for (const [square, piece] of board) {
        if (piece.type === 'k' && piece.color === turn) checkedKing = square;
      }
    }

    const outcome = this.outcome();
    return {
      fen,
      board,
      turn,
      inCheck,
      checkedKing,
      legal: outcome ? EMPTY_LEGAL : this.legalMoves(),
      halfmoveClock: Number(fen.split(' ')[4]),
      outcome,
    };
  }

  private outcome(): RulesOutcome | null {
    const chess = this.chess;
    if (chess.isCheckmate()) return { kind: 'checkmate', winner: opponent(chess.turn()) };
    if (chess.isStalemate()) return { kind: 'stalemate' };
    if (chess.isThreefoldRepetition()) return { kind: 'threefold' };
    if (chess.isDrawByFiftyMoves()) return { kind: 'fiftyMove' };
    if (chess.isInsufficientMaterial()) return { kind: 'insufficientMaterial' };
    return null;
  }

  private legalMoves(): Map<Square, MoveOption[]> {
    const legal = new Map<Square, MoveOption[]>();
    for (const move of this.chess.moves({ verbose: true })) {
      const options = legal.get(move.from) ?? [];
      if (!options.some((o) => o.to === move.to)) {
        options.push({ to: move.to, capture: move.isCapture() || move.isEnPassant(), promotion: move.isPromotion() });
      }
      legal.set(move.from, options);
    }
    return legal;
  }
}

function toDetail(move: Move): MoveDetail {
  const detail: MoveDetail = { color: move.color, from: move.from, to: move.to, piece: move.piece, san: move.san };
  if (move.captured) {
    const square = move.isEnPassant() ? (`${move.to[0]}${move.from[1]}` as Square) : move.to;
    detail.captured = { piece: { color: opponent(move.color), type: move.captured }, square };
  }
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    const rank = move.from[1];
    detail.rook = move.isKingsideCastle()
      ? { from: `h${rank}` as Square, to: `f${rank}` as Square }
      : { from: `a${rank}` as Square, to: `d${rank}` as Square };
  }
  if (move.promotion) detail.promotion = move.promotion as MoveDetail['promotion'];
  return detail;
}
