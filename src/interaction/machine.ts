import type { Color, MoveInput, MoveOption, Piece, PromotionPiece, Square } from '../rules/types';
import type { Point } from './geometry';

export type { Point } from './geometry';

export type InteractionState =
  | { kind: 'idle' }
  | { kind: 'pressed'; from: Square; pointerId: number; start: Point; wasSelected: boolean }
  | { kind: 'selected'; from: Square }
  /** `point` is the last pointer position, used to put the piece back on cancel. */
  | { kind: 'dragging'; from: Square; pointerId: number; hover: Square | null; point: Point }
  | { kind: 'promoting'; from: Square; to: Square; via: 'click' | 'drag' };

export type InteractionEvent =
  /** `square` null = off the board. */
  | { type: 'down'; square: Square | null; point: Point; pointerId: number }
  | { type: 'move'; square: Square | null; point: Point; pointerId: number }
  | { type: 'up'; square: Square | null; point: Point; pointerId: number }
  /** Escape, pointercancel, window blur, or a pointerdown outside the board. */
  | { type: 'cancel' }
  | { type: 'choosePromotion'; piece: PromotionPiece }
  /** Lock engaged, new game, or another external state change. */
  | { type: 'reset' };

export interface InteractionContext {
  /** Result, pending offer, or any dialog open. */
  locked: boolean;
  turn: Color;
  board: ReadonlyMap<Square, Piece>;
  legal: ReadonlyMap<Square, readonly MoveOption[]>;
}

export type Effect =
  | { kind: 'commit'; move: MoveInput; via: 'click' | 'drag' | 'picker' }
  /** Slide the piece back to `from`, starting at `start`; null = instant (no tween). */
  | { kind: 'putBack'; from: Square; start: Square | Point | null }
  | { kind: 'previewPromotion'; from: Square; to: Square; via: 'click' | 'drag' };

export interface Transition {
  state: InteractionState;
  effects: Effect[];
}

export const DRAG_THRESHOLD_PX = 4;

const IDLE: InteractionState = { kind: 'idle' };

function stay(state: InteractionState): Transition {
  return { state, effects: [] };
}

function destination(ctx: InteractionContext, from: Square, to: Square | null): MoveOption | null {
  if (to === null) return null;
  return ctx.legal.get(from)?.find((option) => option.to === to) ?? null;
}

function isOwnPiece(ctx: InteractionContext, square: Square | null): square is Square {
  return square !== null && ctx.board.get(square)?.color === ctx.turn;
}

function press(square: Square, e: { point: Point; pointerId: number }, wasSelected: boolean): Transition {
  return stay({ kind: 'pressed', from: square, pointerId: e.pointerId, start: e.point, wasSelected });
}

/** Destination reached by click or drop: commit, or open the promotion picker. */
function reach(from: Square, option: MoveOption, via: 'click' | 'drag'): Transition {
  if (option.promotion) {
    return {
      state: { kind: 'promoting', from, to: option.to, via },
      effects: [{ kind: 'previewPromotion', from, to: option.to, via }],
    };
  }
  return { state: IDLE, effects: [{ kind: 'commit', move: { from, to: option.to }, via }] };
}

export function transition(s: InteractionState, e: InteractionEvent, ctx: InteractionContext): Transition {
  if (e.type === 'reset' || ctx.locked) return stay(s.kind === 'idle' ? s : IDLE);

  switch (s.kind) {
    case 'idle':
      return e.type === 'down' && isOwnPiece(ctx, e.square) ? press(e.square, e, false) : stay(s);

    case 'pressed':
      if (e.type === 'cancel') return stay(IDLE);
      if ((e.type !== 'move' && e.type !== 'up') || e.pointerId !== s.pointerId) return stay(s);
      if (e.type === 'up') return stay(s.wasSelected ? IDLE : { kind: 'selected', from: s.from });
      if (Math.hypot(e.point.x - s.start.x, e.point.y - s.start.y) <= DRAG_THRESHOLD_PX) return stay(s);
      return stay({
        kind: 'dragging',
        from: s.from,
        pointerId: s.pointerId,
        hover: destination(ctx, s.from, e.square)?.to ?? null,
        point: e.point,
      });

    case 'selected': {
      if (e.type === 'cancel') return stay(IDLE);
      if (e.type !== 'down') return stay(s);
      const option = destination(ctx, s.from, e.square);
      if (option) return reach(s.from, option, 'click');
      if (e.square === s.from) return press(s.from, e, true);
      if (isOwnPiece(ctx, e.square)) return press(e.square, e, false);
      return stay(IDLE);
    }

    case 'dragging': {
      if (e.type === 'cancel') return { state: IDLE, effects: [{ kind: 'putBack', from: s.from, start: s.point }] };
      if ((e.type !== 'move' && e.type !== 'up') || e.pointerId !== s.pointerId) return stay(s);
      const option = destination(ctx, s.from, e.square);
      if (e.type === 'move') return stay({ ...s, hover: option?.to ?? null, point: e.point });
      if (option) return reach(s.from, option, 'drag');
      if (e.square === s.from) {
        return { state: { kind: 'selected', from: s.from }, effects: [{ kind: 'putBack', from: s.from, start: null }] };
      }
      return { state: IDLE, effects: [{ kind: 'putBack', from: s.from, start: e.point }] };
    }

    case 'promoting':
      if (e.type === 'choosePromotion') {
        return { state: IDLE, effects: [{ kind: 'commit', move: { from: s.from, to: s.to, promotion: e.piece }, via: 'picker' }] };
      }
      if (e.type === 'cancel' || e.type === 'down') {
        return { state: IDLE, effects: [{ kind: 'putBack', from: s.from, start: s.to }] };
      }
      return stay(s);
  }
}
