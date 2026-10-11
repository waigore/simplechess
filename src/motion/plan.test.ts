import { describe, expect, it } from 'vitest';
import type { MoveDetail } from '../rules/types';
import { COMMIT_MS, PUT_BACK_MS } from './constants';
import { planCommit, planPutBack, slideOffset } from './plan';
import type { BoardFrame } from './plan';

const QUIET: MoveDetail = { color: 'w', from: 'e2', to: 'e4', piece: 'p', san: 'e4' };
const CAPTURE: MoveDetail = {
  color: 'w',
  from: 'e4',
  to: 'd5',
  piece: 'p',
  san: 'exd5',
  captured: { piece: { color: 'b', type: 'p' }, square: 'd5' },
};
const EN_PASSANT: MoveDetail = {
  color: 'w',
  from: 'e5',
  to: 'd6',
  piece: 'p',
  san: 'exd6',
  captured: { piece: { color: 'b', type: 'p' }, square: 'd5' },
};
const CASTLE: MoveDetail = {
  color: 'w',
  from: 'e1',
  to: 'g1',
  piece: 'k',
  san: 'O-O',
  rook: { from: 'h1', to: 'f1' },
};
const PROMOTE_CAPTURE: MoveDetail = {
  color: 'w',
  from: 'b7',
  to: 'a8',
  piece: 'p',
  san: 'bxa8=Q',
  promotion: 'q',
  captured: { piece: { color: 'b', type: 'r' }, square: 'a8' },
};

describe('planCommit', () => {
  it('click: the mover slides 150ms', () => {
    expect(planCommit(QUIET, 'click', false)).toEqual([{ kind: 'slide', square: 'e4', from: 'e2', duration: COMMIT_MS }]);
  });

  it('click capture: the captured piece fades over the same 150ms', () => {
    expect(planCommit(CAPTURE, 'click', false)).toEqual([
      { kind: 'slide', square: 'd5', from: 'e4', duration: COMMIT_MS },
      { kind: 'fade', piece: { color: 'b', type: 'p' }, square: 'd5', duration: COMMIT_MS },
    ]);
  });

  it('click castling: king and rook slide together', () => {
    expect(planCommit(CASTLE, 'click', false)).toEqual([
      { kind: 'slide', square: 'g1', from: 'e1', duration: COMMIT_MS },
      { kind: 'slide', square: 'f1', from: 'h1', duration: COMMIT_MS },
    ]);
  });

  it('click en passant: the pawn on the other square fades', () => {
    expect(planCommit(EN_PASSANT, 'click', false)).toEqual([
      { kind: 'slide', square: 'd6', from: 'e5', duration: COMMIT_MS },
      { kind: 'fade', piece: { color: 'b', type: 'p' }, square: 'd5', duration: COMMIT_MS },
    ]);
  });

  it('drag: the mover snaps and a normal capture is removed at once', () => {
    expect(planCommit(QUIET, 'drag', false)).toEqual([]);
    expect(planCommit(CAPTURE, 'drag', false)).toEqual([]);
  });

  it('drag en passant: the captured pawn still fades', () => {
    expect(planCommit(EN_PASSANT, 'drag', false)).toEqual([
      { kind: 'fade', piece: { color: 'b', type: 'p' }, square: 'd5', duration: COMMIT_MS },
    ]);
  });

  it('drag castling: the rook still slides', () => {
    expect(planCommit(CASTLE, 'drag', false)).toEqual([
      { kind: 'slide', square: 'f1', from: 'h1', duration: COMMIT_MS },
    ]);
  });

  it('picker: nothing moves, the preview already placed the pawn', () => {
    expect(planCommit(PROMOTE_CAPTURE, 'picker', false)).toEqual([]);
  });

  it('reduced motion drops every tween', () => {
    for (const m of [QUIET, CAPTURE, EN_PASSANT, CASTLE, PROMOTE_CAPTURE]) {
      for (const via of ['click', 'drag', 'picker'] as const) expect(planCommit(m, via, true)).toEqual([]);
    }
  });
});

describe('planPutBack', () => {
  it('slides 120ms from the drop point', () => {
    expect(planPutBack('g1', { x: 300, y: 120 }, false)).toEqual([
      { kind: 'slide', square: 'g1', from: { x: 300, y: 120 }, duration: PUT_BACK_MS },
    ]);
  });

  it('slides 120ms from the promotion square after a cancelled promotion', () => {
    expect(planPutBack('b7', 'a8', false)).toEqual([{ kind: 'slide', square: 'b7', from: 'a8', duration: PUT_BACK_MS }]);
  });

  it('a drop on the origin is instant', () => {
    expect(planPutBack('g1', null, false)).toEqual([]);
  });

  it('reduced motion drops the tween', () => {
    expect(planPutBack('g1', { x: 300, y: 120 }, true)).toEqual([]);
    expect(planPutBack('b7', 'a8', true)).toEqual([]);
  });
});

describe('slideOffset', () => {
  /** 400px board at (100, 50): 50px squares. */
  const white: BoardFrame = { rect: { left: 100, top: 50, width: 400, height: 400 }, orientation: 'w' };
  const black: BoardFrame = { ...white, orientation: 'b' };

  it('square to square, White at the bottom', () => {
    expect(slideOffset('e4', 'e2', white)).toEqual({ x: 0, y: 100 });
    expect(slideOffset('f1', 'h1', white)).toEqual({ x: 100, y: 0 });
  });

  it('square to square, Black at the bottom', () => {
    expect(slideOffset('e4', 'e2', black)).toEqual({ x: 0, y: -100 });
    expect(slideOffset('f1', 'h1', black)).toEqual({ x: -100, y: 0 });
  });

  it('from a point: the offset from the square center', () => {
    // g1 with White at the bottom: col 6, row 7, center (100 + 325, 50 + 375).
    expect(slideOffset('g1', { x: 425, y: 425 }, white)).toEqual({ x: 0, y: 0 });
    expect(slideOffset('g1', { x: 410, y: 245 }, white)).toEqual({ x: -15, y: -180 });
    // g1 with Black at the bottom: col 1, row 0, center (100 + 75, 50 + 25).
    expect(slideOffset('g1', { x: 175, y: 75 }, black)).toEqual({ x: 0, y: 0 });
  });
});
