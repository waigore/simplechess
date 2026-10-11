import { squareCell } from '../interaction/geometry';
import type { Point, Rect } from '../interaction/geometry';
import type { Color, MoveDetail, Piece, Square } from '../rules/types';
import { COMMIT_MS, PUT_BACK_MS } from './constants';

export type Tween =
  /** The element already rests at `square`; it slides in from `from`. */
  | { kind: 'slide'; square: Square; from: Square | Point; duration: number }
  /** A ghost of `piece` at `square` fades out. */
  | { kind: 'fade'; piece: Piece; square: Square; duration: number };

export type CommitVia = 'click' | 'drag' | 'picker';

export function planCommit(m: MoveDetail, via: CommitVia, reduced: boolean): Tween[] {
  if (reduced || via === 'picker') return [];
  const tweens: Tween[] = [];
  if (via === 'click') tweens.push({ kind: 'slide', square: m.to, from: m.from, duration: COMMIT_MS });
  if (m.captured && (via === 'click' || m.captured.square !== m.to)) {
    tweens.push({ kind: 'fade', piece: m.captured.piece, square: m.captured.square, duration: COMMIT_MS });
  }
  if (m.rook) tweens.push({ kind: 'slide', square: m.rook.to, from: m.rook.from, duration: COMMIT_MS });
  return tweens;
}

/** `start` is the drop point, the promotion square for a cancelled promotion, or null for a drop on the origin. */
export function planPutBack(from: Square, start: Square | Point | null, reduced: boolean): Tween[] {
  if (reduced || start === null) return [];
  return [{ kind: 'slide', square: from, from: start, duration: PUT_BACK_MS }];
}

export interface BoardFrame {
  /** The board's client rect. */
  rect: Rect;
  /** Color at the bottom of the board as shown. */
  orientation: Color;
}

/** Translation in px from the element's resting place at `square` to where the slide starts. */
export function slideOffset(square: Square, from: Square | Point, frame: BoardFrame): Point {
  const size = frame.rect.width / 8;
  const to = squareCell(square, frame.orientation);
  if (typeof from === 'string') {
    const start = squareCell(from, frame.orientation);
    return { x: (start.col - to.col) * size, y: (start.row - to.row) * size };
  }
  return {
    x: from.x - (frame.rect.left + (to.col + 0.5) * size),
    y: from.y - (frame.rect.top + (to.row + 0.5) * size),
  };
}
