import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RulesGame } from '../rules/rulesGame';
import type { Color, Square } from '../rules/types';
import { squareCell } from './geometry';
import type { Effect, InteractionContext, InteractionState } from './machine';
import { PICKER_ATTR, useBoardPointer } from './useBoardPointer';

const START = (() => {
  const view = RulesGame.replay([]).view();
  return { locked: false, turn: view.turn, board: view.board, legal: view.legal } satisfies InteractionContext;
})();
const PROMOTE = (() => {
  const view = RulesGame.replay([], '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1').view();
  return { locked: false, turn: view.turn, board: view.board, legal: view.legal } satisfies InteractionContext;
})();

/** Board at (0, 0), 400px wide: 50px squares. */
const SIZE = 400;

interface HarnessProps {
  context?: InteractionContext;
  orientation?: Color;
  onEffect?: (effect: Effect) => void;
  onBeforeDown?: () => void;
  onRender?: (state: InteractionState) => void;
}

function Harness({ context = START, orientation = 'w', onEffect = () => {}, onBeforeDown, onRender }: HarnessProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef<HTMLDivElement>(null);
  const { state, send } = useBoardPointer({ boardRef, draggedRef, orientation, context, onEffect, onBeforeDown });
  onRender?.(state);
  return (
    <>
      <div ref={boardRef} data-testid="board">
        <div ref={draggedRef} data-testid="dragged" />
        <div {...{ [PICKER_ATTR]: '' }}>
          <button onClick={() => send({ type: 'choosePromotion', piece: 'n' })}>Promote to knight</button>
        </div>
      </div>
      <button>outside</button>
      <output data-testid="state">{state.kind}</output>
    </>
  );
}

function setup(props: Omit<HarnessProps, 'onEffect'> = {}) {
  const onEffect = vi.fn<(effect: Effect) => void>();
  const utils = render(<Harness onEffect={onEffect} {...props} />);
  const board = screen.getByTestId('board');
  board.getBoundingClientRect = () => ({ left: 0, top: 0, width: SIZE, height: SIZE }) as DOMRect;
  return { ...utils, board, onEffect, kind: () => screen.getByTestId('state').textContent };
}

function center(square: Square, orientation: Color = 'w') {
  const { col, row } = squareCell(square, orientation);
  return { clientX: col * 50 + 25, clientY: row * 50 + 25 };
}

const primary = { pointerId: 1, isPrimary: true, button: 0 };

describe('useBoardPointer', () => {
  it('commits a click-click move on the second pointer down and captures the pointer on press', () => {
    const { board, onEffect, kind } = setup();
    fireEvent.pointerDown(board, { ...primary, ...center('e2') });
    expect(kind()).toBe('pressed');
    expect(board.hasPointerCapture(1)).toBe(true);
    fireEvent.pointerUp(board, { ...primary, ...center('e2') });
    expect(kind()).toBe('selected');
    fireEvent.pointerDown(board, { ...primary, ...center('e4') });
    expect(onEffect).toHaveBeenCalledWith({ kind: 'commit', move: { from: 'e2', to: 'e4' }, via: 'click' });
    expect(kind()).toBe('idle');
  });

  it('maps pointer positions with Black at the bottom', () => {
    const context = { ...START, turn: 'b' as const };
    const { board, kind } = setup({ context, orientation: 'b' });
    fireEvent.pointerDown(board, { ...primary, ...center('e7', 'b') });
    expect(kind()).toBe('pressed');
  });

  it('drags the piece with a direct transform and puts it back when released off the board', () => {
    const renders: InteractionState[] = [];
    const { board, onEffect, kind } = setup({ onRender: (s) => renders.push(s) });
    fireEvent.pointerDown(board, { ...primary, ...center('e2') });
    fireEvent.pointerMove(board, { ...primary, clientX: 240, clientY: 300 });
    expect(kind()).toBe('dragging');
    const dragged = screen.getByTestId('dragged');
    expect(dragged.style.transform).toBe('translate(215px, 275px)');

    const before = renders.length;
    fireEvent.pointerMove(board, { ...primary, clientX: 241, clientY: 301 });
    expect(dragged.style.transform).toBe('translate(216px, 276px)');
    expect(renders.length).toBe(before);

    fireEvent.pointerMove(board, { ...primary, ...center('e4') });
    expect(renders.at(-1)).toMatchObject({ kind: 'dragging', hover: 'e4' });

    fireEvent.pointerUp(board, { ...primary, clientX: 600, clientY: 100 });
    expect(onEffect).toHaveBeenCalledWith({ kind: 'putBack', from: 'e2', start: { x: 600, y: 100 } });
    expect(kind()).toBe('idle');
  });

  it('ignores right clicks, non-primary pointers, and other pointer ids', () => {
    const { board, kind } = setup();
    fireEvent.pointerDown(board, { ...primary, button: 2, ...center('e2') });
    fireEvent.pointerDown(board, { ...primary, isPrimary: false, ...center('e2') });
    expect(kind()).toBe('idle');
    fireEvent.pointerDown(board, { ...primary, ...center('e2') });
    fireEvent.pointerMove(board, { ...primary, pointerId: 2, clientX: 300, clientY: 300 });
    fireEvent.pointerUp(board, { ...primary, pointerId: 2, ...center('e2') });
    fireEvent.pointerCancel(board, { ...primary, pointerId: 2 });
    expect(kind()).toBe('pressed');
  });

  it('cancels a drag on Escape, window blur, pointercancel, and lost capture', () => {
    const { board, onEffect, kind } = setup();
    const startDrag = () => {
      fireEvent.pointerDown(board, { ...primary, ...center('e2') });
      fireEvent.pointerMove(board, { ...primary, clientX: 240, clientY: 300 });
      expect(kind()).toBe('dragging');
    };
    const cancels = [
      () => fireEvent(board, new PointerEvent('lostpointercapture', { pointerId: 1 })),
      () => fireEvent.keyDown(document, { key: 'Escape' }),
      () => fireEvent.blur(window),
      () => fireEvent.pointerCancel(board, primary),
    ];
    for (const cancel of cancels) {
      onEffect.mockClear();
      startDrag();
      cancel();
      expect(kind()).toBe('idle');
      expect(onEffect).toHaveBeenCalledWith({ kind: 'putBack', from: 'e2', start: { x: 240, y: 300 } });
    }
    expect(board.hasPointerCapture(1)).toBe(false);
  });

  it('deselects on a press outside the board, but not on other keys', () => {
    const { board, kind } = setup();
    fireEvent.pointerDown(board, { ...primary, ...center('e2') });
    fireEvent.pointerUp(board, { ...primary, ...center('e2') });
    fireEvent.keyDown(document, { key: 'a' });
    expect(kind()).toBe('selected');
    fireEvent.pointerDown(screen.getByText('outside'), primary);
    expect(kind()).toBe('idle');
  });

  it('leaves presses on the picker to its buttons and cancels on a press elsewhere on the board', () => {
    const { board, onEffect, kind } = setup({ context: PROMOTE });
    fireEvent.pointerDown(board, { ...primary, ...center('b7') });
    fireEvent.pointerUp(board, { ...primary, ...center('b7') });
    fireEvent.pointerDown(board, { ...primary, ...center('b8') });
    expect(kind()).toBe('promoting');

    const knight = screen.getByText('Promote to knight');
    fireEvent.pointerDown(knight, primary);
    expect(kind()).toBe('promoting');
    fireEvent.click(knight);
    expect(onEffect).toHaveBeenLastCalledWith({ kind: 'commit', move: { from: 'b7', to: 'b8', promotion: 'n' }, via: 'picker' });

    fireEvent.pointerDown(board, { ...primary, ...center('b7') });
    fireEvent.pointerUp(board, { ...primary, ...center('b7') });
    fireEvent.pointerDown(board, { ...primary, ...center('b8') });
    fireEvent.pointerDown(board, { ...primary, ...center('e4') });
    expect(onEffect).toHaveBeenLastCalledWith({ kind: 'putBack', from: 'b7', start: 'b8' });
    expect(kind()).toBe('idle');
  });

  it('runs onBeforeDown on every board press', () => {
    const onBeforeDown = vi.fn();
    const { board } = setup({ onBeforeDown });
    fireEvent.pointerDown(board, { ...primary, ...center('e5') });
    expect(onBeforeDown).toHaveBeenCalledTimes(1);
  });

  it('resets when the board locks', () => {
    const { board, kind, rerender, onEffect } = setup();
    fireEvent.pointerDown(board, { ...primary, ...center('e2') });
    fireEvent.pointerUp(board, { ...primary, ...center('e2') });
    expect(kind()).toBe('selected');
    act(() => rerender(<Harness onEffect={onEffect} context={{ ...START, locked: true }} />));
    expect(kind()).toBe('idle');
    fireEvent.pointerDown(board, { ...primary, ...center('e2') });
    expect(kind()).toBe('idle');
  });
});
