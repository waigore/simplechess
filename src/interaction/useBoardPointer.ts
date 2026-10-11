import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Color } from '../rules/types';
import { squareAt } from './geometry';
import type { Point, Rect } from './geometry';
import { transition } from './machine';
import type { Effect, InteractionContext, InteractionEvent, InteractionState } from './machine';

/** Marks the promotion picker cells; presses inside it are left to the picker's own buttons. */
export const PICKER_ATTR = 'data-promotion-picker';

export interface BoardPointerOptions {
  boardRef: RefObject<HTMLElement | null>;
  /** The piece that follows the pointer while dragging; its transform is written directly, without a render. */
  draggedRef: RefObject<HTMLElement | null>;
  /** Color at the bottom of the board as shown. */
  orientation: Color;
  context: InteractionContext;
  onEffect: (effect: Effect) => void;
  /** Runs on every board press after the square is resolved, e.g. to finish running tweens. */
  onBeforeDown?: () => void;
}

export interface BoardPointer {
  state: InteractionState;
  send: (event: InteractionEvent) => void;
}

const IDLE: InteractionState = { kind: 'idle' };

function activePointer(state: InteractionState): number | null {
  return state.kind === 'pressed' || state.kind === 'dragging' ? state.pointerId : null;
}

/** Pointer moves during a drag only re-render when the hovered square changes. */
function sameRender(a: InteractionState, b: InteractionState): boolean {
  return a === b || (a.kind === 'dragging' && b.kind === 'dragging' && a.from === b.from && a.hover === b.hover);
}

function insidePicker(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${PICKER_ATTR}]`) !== null;
}

export function useBoardPointer(options: BoardPointerOptions): BoardPointer {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });

  const stateRef = useRef<InteractionState>(IDLE);
  const rectRef = useRef<Rect | null>(null);
  const [state, setState] = useState<InteractionState>(IDLE);

  const send = useCallback((event: InteractionEvent) => {
    const prev = stateRef.current;
    const next = transition(prev, event, latest.current.context);
    stateRef.current = next.state;
    if (!sameRender(prev, next.state)) setState(next.state);
    for (const effect of next.effects) latest.current.onEffect(effect);
  }, []);

  const placeDragged = useCallback((point: Point) => {
    const el = latest.current.draggedRef.current;
    const rect = rectRef.current;
    if (!el || !rect) return;
    const half = rect.width / 16;
    el.style.transform = `translate(${point.x - rect.left - half}px, ${point.y - rect.top - half}px)`;
  }, []);

  useLayoutEffect(() => {
    if (state.kind === 'dragging' && stateRef.current.kind === 'dragging') placeDragged(stateRef.current.point);
  }, [state, placeDragged]);

  const locked = options.context.locked;
  useEffect(() => {
    if (locked) send({ type: 'reset' });
  }, [locked, send]);

  useEffect(() => {
    const board = latest.current.boardRef.current;
    if (!board) return;

    const locate = (ev: PointerEvent) => {
      const point = { x: ev.clientX, y: ev.clientY };
      const rect = rectRef.current;
      return { point, square: rect ? squareAt(point, rect, latest.current.orientation) : null, pointerId: ev.pointerId };
    };

    const cancel = () => {
      if (stateRef.current.kind === 'idle') return;
      const pointerId = activePointer(stateRef.current);
      send({ type: 'cancel' });
      if (pointerId !== null && board.hasPointerCapture(pointerId)) board.releasePointerCapture(pointerId);
    };

    const onDown = (ev: PointerEvent) => {
      if (!ev.isPrimary || ev.button !== 0 || insidePicker(ev.target)) return;
      rectRef.current = board.getBoundingClientRect();
      const located = locate(ev);
      latest.current.onBeforeDown?.();
      send({ type: 'down', ...located });
      if (stateRef.current.kind === 'pressed') board.setPointerCapture(ev.pointerId);
    };

    const onMove = (ev: PointerEvent) => {
      if (activePointer(stateRef.current) !== ev.pointerId) return;
      send({ type: 'move', ...locate(ev) });
      if (stateRef.current.kind === 'dragging') placeDragged(stateRef.current.point);
    };

    const onUp = (ev: PointerEvent) => {
      if (activePointer(stateRef.current) === ev.pointerId) send({ type: 'up', ...locate(ev) });
    };

    const onPointerCancel = (ev: PointerEvent) => {
      if (activePointer(stateRef.current) === ev.pointerId) cancel();
    };

    const onLostCapture = (ev: PointerEvent) => {
      const s = stateRef.current;
      if (s.kind === 'dragging' && s.pointerId === ev.pointerId) send({ type: 'cancel' });
    };

    const onDocumentDown = (ev: PointerEvent) => {
      const kind = stateRef.current.kind;
      if ((kind !== 'selected' && kind !== 'promoting') || insidePicker(ev.target)) return;
      if (!(ev.target instanceof Node) || !board.contains(ev.target)) cancel();
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') cancel();
    };

    board.addEventListener('pointerdown', onDown);
    board.addEventListener('pointermove', onMove);
    board.addEventListener('pointerup', onUp);
    board.addEventListener('pointercancel', onPointerCancel);
    board.addEventListener('lostpointercapture', onLostCapture);
    document.addEventListener('pointerdown', onDocumentDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', cancel);
    return () => {
      board.removeEventListener('pointerdown', onDown);
      board.removeEventListener('pointermove', onMove);
      board.removeEventListener('pointerup', onUp);
      board.removeEventListener('pointercancel', onPointerCancel);
      board.removeEventListener('lostpointercapture', onLostCapture);
      document.removeEventListener('pointerdown', onDocumentDown, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', cancel);
    };
  }, [send, placeDragged]);

  return { state, send };
}
