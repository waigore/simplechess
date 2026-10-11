import { act, fireEvent, render, screen } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSetup } from '../../game/defaults';
import { createGameStore } from '../../game/gameStore';
import type { GameStore } from '../../game/gameStore';
import { squareCell } from '../../interaction/geometry';
import { COMMIT_MS, PUT_BACK_MS } from '../../motion/constants';
import type { Color, Square } from '../../rules/types';
import { StubAnimation } from '../../test/animation';
import { sanToMoves } from '../../test/fixtures';
import { REDUCED_MOTION, setMediaQuery } from '../../test/media';
import { Board } from './Board';

const SIZE = 400;
const primary = { pointerId: 1, isPrimary: true, button: 0 };

/** White pawn on b7 can take the rook on a8 and promote. */
const PROMOTION_LINE = ['a4', 'b5', 'axb5', 'a6', 'bxa6', 'Bb7', 'axb7', 'Nf6'];

interface HarnessProps {
  store: GameStore;
  orientation?: Color;
  locked?: boolean;
  onSettled?: () => void;
}

function Harness({ store, orientation = 'w', locked = false, onSettled = () => {} }: HarnessProps) {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  return (
    <Board
      size={SIZE}
      orientation={orientation}
      position={state.position}
      lastMove={state.lastMove}
      locked={locked}
      onMove={(m) => store.move(m)}
      onSettled={onSettled}
    />
  );
}

function setup(sans: string[] = [], props: Omit<HarnessProps, 'store'> = {}) {
  const store = createGameStore({
    setup: defaultSetup(),
    moves: sanToMoves(sans),
    termination: null,
    drawOffer: { state: 'none' },
  });
  const onSettled = vi.fn();
  const animate = vi.spyOn(Element.prototype, 'animate');
  const utils = render(<Harness store={store} onSettled={onSettled} {...props} />);
  const board = screen.getByTestId('board');
  board.getBoundingClientRect = () => ({ left: 0, top: 0, width: SIZE, height: SIZE }) as DOMRect;
  return { ...utils, store, board, onSettled, animate };
}

function center(square: Square, orientation: Color = 'w') {
  const { col, row } = squareCell(square, orientation);
  return { clientX: col * 50 + 25, clientY: row * 50 + 25 };
}

function press(board: HTMLElement, square: Square, orientation: Color = 'w') {
  fireEvent.pointerDown(board, { ...primary, ...center(square, orientation) });
}

function click(board: HTMLElement, square: Square, orientation: Color = 'w') {
  press(board, square, orientation);
  fireEvent.pointerUp(board, { ...primary, ...center(square, orientation) });
}

function pieceAt(board: HTMLElement, square: Square) {
  return board.querySelector<HTMLElement>(`[data-piece="${square}"]`)?.dataset.kind ?? null;
}

function markers(board: HTMLElement) {
  return [...board.querySelectorAll<HTMLElement>('[data-marker]')].map((el) => `${el.dataset.marker}:${el.className.split('--')[1]}`).sort();
}

function lastAnimation(animate: ReturnType<typeof vi.spyOn>) {
  return animate.mock.results.at(-1)?.value as StubAnimation;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Board', () => {
  it('draws 64 squares, the start position, and coordinates for White at the bottom', () => {
    const { board } = setup();
    expect(board.querySelectorAll('[data-square]')).toHaveLength(64);
    expect(board.querySelectorAll('[data-piece]')).toHaveLength(32);
    expect(pieceAt(board, 'e1')).toBe('wK');
    expect(pieceAt(board, 'd8')).toBe('bQ');
    expect(board.querySelector('[data-square="a1"]')?.className).toContain('square--dark');
    expect(board.querySelector('[data-square="h1"]')?.className).toContain('square--light');
    const coords = [...board.querySelectorAll('.coord')].map((el) => el.textContent).join('');
    expect(coords).toBe('87654321abcdefgh');
  });

  it('follows orientation for squares and coordinates with Black at the bottom', () => {
    const { board } = setup([], { orientation: 'b' });
    const coords = [...board.querySelectorAll('.coord')].map((el) => el.textContent).join('');
    expect(coords).toBe('12345678hgfedcba');
    expect(board.querySelector<HTMLElement>('[data-piece="e8"]')?.style.top).toBe('87.5%');
  });

  it('only marks pieces of the side to move as grabbable, and none when locked', () => {
    const { board, rerender, store } = setup();
    expect(board.querySelector('[data-piece="e2"]')?.className).toContain('piece--grab');
    expect(board.querySelector('[data-piece="e7"]')?.className).not.toContain('piece--grab');
    rerender(<Harness store={store} locked />);
    expect(board.querySelectorAll('.piece--grab')).toHaveLength(0);
  });

  it('selects on press and shows dot markers for empty destinations', () => {
    const { board } = setup();
    press(board, 'g1');
    expect(screen.getByTestId('selected').parentElement?.dataset.square).toBe('g1');
    expect(markers(board)).toEqual(['f3:dot', 'h3:dot']);
  });

  it('does not select an opponent piece', () => {
    const { board } = setup();
    click(board, 'e7');
    expect(screen.queryByTestId('selected')).toBeNull();
    expect(markers(board)).toEqual([]);
  });

  it('commits e2-e4 by click-click with a 150ms slide, then reports settled', () => {
    const { board, store, onSettled, animate } = setup();
    click(board, 'e2');
    press(board, 'e4');
    expect(store.getState().history.map((m) => m.san)).toEqual(['e4']);
    expect(pieceAt(board, 'e4')).toBe('wP');
    expect(pieceAt(board, 'e2')).toBeNull();
    expect(markers(board)).toEqual([]);
    expect(board.querySelectorAll('.overlay--last-move')).toHaveLength(2);

    expect(animate).toHaveBeenCalledTimes(1);
    const slide = lastAnimation(animate);
    expect(animate.mock.contexts[0]).toBe(board.querySelector('[data-piece="e4"]'));
    expect(slide.options.duration).toBe(COMMIT_MS);
    expect(slide.keyframes[0]).toEqual({ transform: 'translate(0px, 100px)' });
    expect(onSettled).not.toHaveBeenCalled();
    act(() => slide.finish());
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('fades a captured piece as a ghost and removes it when the move settles', () => {
    const { board, animate } = setup(['e4', 'd5']);
    click(board, 'e4');
    expect(markers(board)).toContain('d5:ring');
    press(board, 'd5');
    const ghost = board.querySelector<HTMLElement>('[data-ghost="d5"]');
    expect(ghost?.dataset.kind).toBe('bP');
    expect(pieceAt(board, 'd5')).toBe('wP');
    expect(animate).toHaveBeenCalledTimes(2);
    act(() => animate.mock.results.forEach((r) => (r.value as StubAnimation).finish()));
    expect(board.querySelector('[data-ghost]')).toBeNull();
  });

  it('finishes a running move when the next press arrives', () => {
    const { board, onSettled, animate } = setup();
    click(board, 'e2');
    press(board, 'e4');
    const slide = lastAnimation(animate);
    press(board, 'e7');
    expect(slide.playState).toBe('finished');
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('commits with no tweens and settles at once under reduced motion', () => {
    setMediaQuery(REDUCED_MOTION, true);
    const { board, store, onSettled, animate } = setup();
    click(board, 'e2');
    press(board, 'e4');
    expect(store.getState().history).toHaveLength(1);
    expect(animate).not.toHaveBeenCalled();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('drags a piece: lifts it, tints the hovered legal square, and snaps on a legal drop', () => {
    const { board, store, animate } = setup();
    press(board, 'e2');
    fireEvent.pointerMove(board, { ...primary, ...center('e4') });
    expect(board.className).toContain('board--dragging');
    expect(board.querySelector('[data-piece="e2"]')?.className).toContain('piece--lifted');
    expect(screen.getByTestId('dragged').style.transform).toBe('translate(200px, 200px)');
    expect(markers(board)).toEqual(['e3:dot', 'e4:hover']);

    fireEvent.pointerUp(board, { ...primary, ...center('e4') });
    expect(store.getState().history.map((m) => m.san)).toEqual(['e4']);
    expect(screen.queryByTestId('dragged')).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });

  it('puts a piece back with a 120ms slide when dropped off the board, with no move', () => {
    const { board, store, animate } = setup();
    press(board, 'e2');
    fireEvent.pointerMove(board, { ...primary, clientX: 225, clientY: 280 });
    fireEvent.pointerUp(board, { ...primary, clientX: 500, clientY: 500 });
    expect(store.getState().history).toHaveLength(0);
    expect(pieceAt(board, 'e2')).toBe('wP');
    expect(screen.queryByTestId('selected')).toBeNull();
    const slide = lastAnimation(animate);
    expect(animate.mock.contexts[0]).toBe(board.querySelector('[data-piece="e2"]'));
    expect(slide.options.duration).toBe(PUT_BACK_MS);
  });

  it('shows the check highlight on the checked king', () => {
    setup(['f3', 'e5', 'g4', 'Qh4#']);
    expect(screen.getByTestId('check').parentElement?.dataset.square).toBe('e1');
  });

  describe('promotion', () => {
    function openPicker() {
      const utils = setup(PROMOTION_LINE);
      click(utils.board, 'b7');
      press(utils.board, 'a8');
      return utils;
    }

    it('previews the pawn on the promotion square and offers four pieces from it inward', () => {
      const { board, store } = openPicker();
      expect(store.getState().history).toHaveLength(PROMOTION_LINE.length);
      expect(pieceAt(board, 'a8')).toBe('wP');
      expect(pieceAt(board, 'b7')).toBeNull();
      const cells = screen.getAllByRole('button');
      expect(cells.map((c) => c.getAttribute('aria-label'))).toEqual([
        'Promote to queen',
        'Promote to knight',
        'Promote to rook',
        'Promote to bishop',
      ]);
      expect(cells.map((c) => c.style.top)).toEqual(['0%', '12.5%', '25%', '37.5%']);
      expect(cells.every((c) => c.style.left === '0%')).toBe(true);
      expect(document.activeElement).toBe(cells[0]);
      expect(board.querySelectorAll('.piece--grab')).toHaveLength(0);
    });

    it('runs the picker toward the center from the bottom when the board is flipped', () => {
      const store = createGameStore({ setup: defaultSetup(), moves: sanToMoves(PROMOTION_LINE), termination: null, drawOffer: { state: 'none' } });
      render(<Harness store={store} orientation="b" />);
      const board = screen.getByTestId('board');
      board.getBoundingClientRect = () => ({ left: 0, top: 0, width: SIZE, height: SIZE }) as DOMRect;
      click(board, 'b7', 'b');
      press(board, 'a8', 'b');
      expect(screen.getAllByRole('button').map((c) => c.style.top)).toEqual(['87.5%', '75%', '62.5%', '50%']);
    });

    it('commits the chosen piece', () => {
      const { store } = openPicker();
      fireEvent.click(screen.getByRole('button', { name: 'Promote to knight' }));
      expect(store.getState().history.at(-1)?.san).toBe('bxa8=N');
      expect(screen.queryByRole('group', { name: 'Promotion' })).toBeNull();
    });

    it('cancels on Escape: the pawn goes back and the captured rook reappears', () => {
      const { board, store } = openPicker();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('group', { name: 'Promotion' })).toBeNull();
      expect(pieceAt(board, 'b7')).toBe('wP');
      expect(pieceAt(board, 'a8')).toBe('bR');
      expect(store.getState().history).toHaveLength(PROMOTION_LINE.length);
    });

    it('cancels on a press on the dimmed board', () => {
      const { board, store } = openPicker();
      press(board, 'h1');
      expect(screen.queryByRole('group', { name: 'Promotion' })).toBeNull();
      expect(store.getState().history).toHaveLength(PROMOTION_LINE.length);
    });

    it('wraps Tab and Shift+Tab inside the four cells', () => {
      openPicker();
      const cells = screen.getAllByRole('button');
      cells[3]?.focus();
      fireEvent.keyDown(cells[3]!, { key: 'Tab' });
      expect(document.activeElement).toBe(cells[0]);
      fireEvent.keyDown(cells[0]!, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(cells[3]);
      fireEvent.keyDown(cells[3]!, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(cells[3]);
      fireEvent.keyDown(cells[3]!, { key: 'Enter' });
      expect(document.activeElement).toBe(cells[3]);
    });
  });
});
