import { describe, expect, it } from 'vitest';
import { RulesGame } from '../rules/rulesGame';
import type { MoveInput, Square } from '../rules/types';
import { DRAG_THRESHOLD_PX, transition } from './machine';
import type { InteractionContext, InteractionEvent, InteractionState, Point } from './machine';

function context(moves: MoveInput[] = [], fen?: string, locked = false): InteractionContext {
  const view = RulesGame.replay(moves, fen).view();
  return { locked, turn: view.turn, board: view.board, legal: view.legal };
}

const START = context();
/** 1. e4 d5: White's e4 pawn can capture on d5. */
const CAPTURE = context([
  { from: 'e2', to: 'e4' },
  { from: 'd7', to: 'd5' },
]);
/** White pawn on b7 promotes on b8 or by capturing on a8. */
const PROMOTE = context([], 'r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1');

const P0: Point = { x: 10, y: 10 };
const down = (square: Square | null, point: Point = P0, pointerId = 1): InteractionEvent => ({ type: 'down', square, point, pointerId });
const move = (square: Square | null, point: Point, pointerId = 1): InteractionEvent => ({ type: 'move', square, point, pointerId });
const up = (square: Square | null, point: Point = P0, pointerId = 1): InteractionEvent => ({ type: 'up', square, point, pointerId });
const far: Point = { x: P0.x + DRAG_THRESHOLD_PX + 1, y: P0.y };

function run(events: InteractionEvent[], ctx: InteractionContext = START, from: InteractionState = { kind: 'idle' }) {
  let state = from;
  const effects = [];
  for (const e of events) {
    const next = transition(state, e, ctx);
    state = next.state;
    effects.push(...next.effects);
  }
  return { state, effects };
}

const selected = (from: Square): InteractionState => ({ kind: 'selected', from });

describe('interaction machine (design §6)', () => {
  it('row 1: pressing an own piece selects it', () => {
    expect(run([down('e2')]).state).toEqual({ kind: 'pressed', from: 'e2', pointerId: 1, start: P0, wasSelected: false });
  });

  it('row 2: moving more than 4px while pressed starts a drag', () => {
    const { state } = run([down('e2'), move('e2', { x: P0.x + 3, y: P0.y + 2 })]);
    expect(state.kind).toBe('pressed');
    expect(run([down('e2'), move('e3', far)]).state).toEqual({
      kind: 'dragging',
      from: 'e2',
      pointerId: 1,
      hover: 'e3',
      point: far,
    });
  });

  it('row 3: releasing without dragging keeps the piece selected', () => {
    expect(run([down('e2'), move('e2', { x: P0.x + DRAG_THRESHOLD_PX, y: P0.y }), up('e2')])).toEqual({
      state: selected('e2'),
      effects: [],
    });
  });

  it('row 4: pressing a legal destination commits on pointer down; the following up does nothing', () => {
    const pressed = run([down('e4')], START, selected('e2'));
    expect(pressed).toEqual({ state: { kind: 'idle' }, effects: [{ kind: 'commit', move: { from: 'e2', to: 'e4' }, via: 'click' }] });
    expect(run([up('e4')], START, pressed.state)).toEqual({ state: { kind: 'idle' }, effects: [] });
  });

  it('row 4: a legal capture is a legal destination', () => {
    expect(run([down('d5')], CAPTURE, selected('e4')).effects).toEqual([
      { kind: 'commit', move: { from: 'e4', to: 'd5' }, via: 'click' },
    ]);
  });

  it('row 5: pressing the selected piece again deselects on release, or drags if moved', () => {
    expect(run([down('e2'), up('e2')], START, selected('e2')).state).toEqual({ kind: 'idle' });
    expect(run([down('e2'), move('e4', far)], START, selected('e2')).state).toMatchObject({ kind: 'dragging', from: 'e2', hover: 'e4' });
  });

  it('row 6: pressing another own piece selects it instead', () => {
    expect(run([down('g1'), up('g1')], START, selected('e2')).state).toEqual(selected('g1'));
    expect(run([down('g1'), move('f3', far)], START, selected('e2')).state).toMatchObject({ kind: 'dragging', from: 'g1', hover: 'f3' });
  });

  it('row 7: an illegal square, an opponent piece, off the board, or cancel deselects', () => {
    for (const e of [down('e5'), down('e7'), down(null), { type: 'cancel' } as const]) {
      expect(run([e], START, selected('e2'))).toEqual({ state: { kind: 'idle' }, effects: [] });
    }
  });

  it('row 8: releasing a drag on a legal destination commits', () => {
    expect(run([down('e2'), move('e4', far), up('e4', far)]).effects).toEqual([
      { kind: 'commit', move: { from: 'e2', to: 'e4' }, via: 'drag' },
    ]);
  });

  it('row 9: releasing a drag on the origin puts it back instantly and keeps it selected', () => {
    expect(run([down('e2'), move('e3', far), up('e2', P0)])).toEqual({
      state: selected('e2'),
      effects: [{ kind: 'putBack', from: 'e2', start: null }],
    });
  });

  it('row 10: releasing a drag on an illegal square or off the board puts it back from the drop point', () => {
    const drop = { x: 200, y: 200 };
    for (const square of ['e5', 'd7', null] as const) {
      expect(run([down('e2'), move('e3', far), up(square, drop)])).toEqual({
        state: { kind: 'idle' },
        effects: [{ kind: 'putBack', from: 'e2', start: drop }],
      });
    }
  });

  it('row 11: cancelling a drag puts it back from the last pointer point', () => {
    const last = { x: 300, y: 40 };
    expect(run([down('e2'), move('e3', far), move(null, last), { type: 'cancel' }])).toEqual({
      state: { kind: 'idle' },
      effects: [{ kind: 'putBack', from: 'e2', start: last }],
    });
  });

  it('rows 12 and 13: pressing an opponent piece, an empty square, or off the board does nothing', () => {
    for (const square of ['e7', 'e4', null] as const) {
      expect(run([down(square), move(square, far), up(square)])).toEqual({ state: { kind: 'idle' }, effects: [] });
    }
  });

  it('row 14: nothing can be picked up while locked, and locking clears any state', () => {
    const locked = { ...START, locked: true };
    expect(run([down('e2'), up('e2')], locked).state).toEqual({ kind: 'idle' });
    expect(run([down('e4')], locked, selected('e2'))).toEqual({ state: { kind: 'idle' }, effects: [] });
  });

  it('marks drag hover only over legal destinations', () => {
    const dragging = run([down('e2'), move('e4', far)]).state;
    expect(run([move('e5', { x: 50, y: 50 })], START, dragging).state).toMatchObject({ hover: null });
    expect(run([move('e3', { x: 60, y: 60 })], START, dragging).state).toMatchObject({ hover: 'e3' });
    expect(run([move(null, { x: 70, y: 70 })], START, dragging).state).toMatchObject({ hover: null });
  });

  it('ignores a second pointer while pressed or dragging', () => {
    const pressed = run([down('e2')]).state;
    expect(run([move('e4', far, 2), up('e4', far, 2)], START, pressed).state).toBe(pressed);
    const dragging = run([down('e2'), move('e3', far)]).state;
    expect(run([move('e4', far, 2), up('e4', far, 2), down('g1', far, 2)], START, dragging).state).toBe(dragging);
  });

  it('ignores events that do not apply to the current state', () => {
    const sel = selected('e2');
    expect(run([move('e4', far), up('e4'), { type: 'choosePromotion', piece: 'q' }], START, sel).state).toBe(sel);
    expect(run([{ type: 'cancel' }]).state).toEqual({ kind: 'idle' });
    expect(run([{ type: 'cancel' }], START, run([down('e2')]).state).state).toEqual({ kind: 'idle' });
  });

  it('reset returns every state to idle with no effects', () => {
    const states: InteractionState[] = [
      { kind: 'idle' },
      run([down('e2')]).state,
      selected('e2'),
      run([down('e2'), move('e3', far)]).state,
      { kind: 'promoting', from: 'b7', to: 'b8', via: 'click' },
    ];
    for (const s of states) {
      expect(transition(s, { type: 'reset' }, START)).toEqual({ state: { kind: 'idle' }, effects: [] });
    }
  });
});

describe('interaction machine: promotion (design §7)', () => {
  it('clicking a promotion square previews it without committing', () => {
    expect(run([down('b8')], PROMOTE, selected('b7'))).toEqual({
      state: { kind: 'promoting', from: 'b7', to: 'b8', via: 'click' },
      effects: [{ kind: 'previewPromotion', from: 'b7', to: 'b8', via: 'click' }],
    });
  });

  it('dropping on a promotion capture square previews it; the release that opened the picker chooses nothing', () => {
    const { state, effects } = run([down('b7'), move('a8', far), up('a8', far)], PROMOTE);
    expect(state).toEqual({ kind: 'promoting', from: 'b7', to: 'a8', via: 'drag' });
    expect(effects).toEqual([{ kind: 'previewPromotion', from: 'b7', to: 'a8', via: 'drag' }]);
    expect(run([up('a8'), move('a8', far)], PROMOTE, state).state).toBe(state);
  });

  it('choosing a piece commits the promotion through the picker', () => {
    for (const piece of ['q', 'n', 'r', 'b'] as const) {
      expect(run([down('b8'), { type: 'choosePromotion', piece }], PROMOTE, selected('b7'))).toEqual({
        state: { kind: 'idle' },
        effects: [
          { kind: 'previewPromotion', from: 'b7', to: 'b8', via: 'click' },
          { kind: 'commit', move: { from: 'b7', to: 'b8', promotion: piece }, via: 'picker' },
        ],
      });
    }
  });

  it('Escape or a press outside the picker cancels and slides the pawn back from the promotion square', () => {
    const promoting: InteractionState = { kind: 'promoting', from: 'b7', to: 'a8', via: 'drag' };
    for (const e of [{ type: 'cancel' } as const, down('e1'), down(null)]) {
      expect(run([e], PROMOTE, promoting)).toEqual({
        state: { kind: 'idle' },
        effects: [{ kind: 'putBack', from: 'b7', start: 'a8' }],
      });
    }
  });
});
