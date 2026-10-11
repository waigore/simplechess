import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Effect, InteractionContext, InteractionState } from '../../interaction/machine';
import { useBoardPointer } from '../../interaction/useBoardPointer';
import { createAnimator } from '../../motion/animator';
import type { Animator } from '../../motion/animator';
import { planCommit, planPreview, planPutBack } from '../../motion/plan';
import type { Tween } from '../../motion/plan';
import { useReducedMotion } from '../../motion/useReducedMotion';
import type { Color, MoveDetail, MoveInput, Piece, PositionView, Square } from '../../rules/types';
import { Coordinates } from './Coordinates';
import { GhostsLayer } from './GhostsLayer';
import type { Ghost } from './GhostsLayer';
import { MarkersLayer } from './MarkersLayer';
import { PiecesLayer } from './PiecesLayer';
import { pieceUrl } from './pieceAssets';
import { PromotionPicker } from './PromotionPicker';
import { SquaresLayer } from './SquaresLayer';
import './Board.css';

export interface BoardProps {
  /** Side in px, a multiple of 8. */
  size: number;
  /** Color at the bottom of the board as shown. */
  orientation: Color;
  position: PositionView;
  lastMove: { from: Square; to: Square } | null;
  /** Result, pending draw offer, or a dialog open. */
  locked: boolean;
  /** Commits a move to the game; returns null when it was refused. */
  onMove: (move: MoveInput) => MoveDetail | null;
  /** Every tween batch (move, put-back, promotion preview) has finished or was cut short. */
  onSettled: () => void;
}

const NO_OPTIONS: readonly never[] = [];

function heldSquare(s: InteractionState): Square | null {
  return s.kind === 'pressed' || s.kind === 'selected' || s.kind === 'dragging' ? s.from : null;
}

/** While the picker is open the pawn already stands on the promotion square; nothing is committed yet. */
function shownBoard(board: ReadonlyMap<Square, Piece>, s: InteractionState): ReadonlyMap<Square, Piece> {
  if (s.kind !== 'promoting') return board;
  const pawn = board.get(s.from);
  const preview = new Map(board);
  preview.delete(s.from);
  if (pawn) preview.set(s.to, pawn);
  return preview;
}

export function Board({ size, orientation, position, lastMove, locked, onMove, onSettled }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const latest = useRef({ orientation, onSettled });
  useLayoutEffect(() => {
    latest.current = { orientation, onSettled };
  });

  const animatorRef = useRef<Animator | null>(null);
  useLayoutEffect(() => {
    animatorRef.current = createAnimator(() => ({
      rect: (boardRef.current as HTMLElement).getBoundingClientRect(),
      orientation: latest.current.orientation,
    }));
  }, []);

  /** A new object per batch; cleared when that batch settles. */
  const [motion, setMotion] = useState<{ tweens: Tween[] } | null>(null);

  const onEffect = (effect: Effect) => {
    switch (effect.kind) {
      case 'commit': {
        const detail = onMove(effect.move);
        if (detail) setMotion({ tweens: planCommit(detail, effect.via, reduced) });
        return;
      }
      case 'putBack':
        setMotion({ tweens: planPutBack(effect.from, effect.start, reduced) });
        return;
      case 'previewPromotion':
        setMotion({ tweens: planPreview(effect.from, effect.to, effect.via, reduced) });
        return;
    }
  };

  const context = useMemo<InteractionContext>(
    () => ({ locked, turn: position.turn, board: position.board, legal: position.legal }),
    [locked, position],
  );

  const { state, send } = useBoardPointer({
    boardRef,
    draggedRef,
    orientation,
    context,
    onEffect,
    onBeforeDown: () => animatorRef.current?.finishAll(),
  });

  useLayoutEffect(() => {
    if (!motion) return;
    const resolve = (t: Tween) => {
      const selector = t.kind === 'slide' ? `[data-piece="${t.square}"]` : `[data-ghost="${t.square}"]`;
      return boardRef.current?.querySelector<HTMLElement>(selector) ?? null;
    };
    animatorRef.current?.run(motion.tweens, resolve, () => {
      setMotion((m) => (m === motion ? null : m));
      latest.current.onSettled();
    });
  }, [motion]);

  const held = heldSquare(state);
  const board = shownBoard(position.board, state);
  const ghosts: Ghost[] = (motion?.tweens ?? []).flatMap((t) => (t.kind === 'fade' ? [{ piece: t.piece, square: t.square }] : []));
  const dragged = state.kind === 'dragging' ? position.board.get(state.from) : undefined;
  const promoting = state.kind === 'promoting' ? state : null;
  const grabbable = locked || promoting ? null : position.turn;

  const style = {
    width: size,
    height: size,
    '--coord-size': `${Math.min(16, Math.max(10, (size / 8) * 0.14))}px`,
  } as CSSProperties;

  return (
    <div
      ref={boardRef}
      className={`board${state.kind === 'dragging' ? ' board--dragging' : ''}`}
      style={style}
      data-testid="board"
    >
      <SquaresLayer orientation={orientation} lastMove={lastMove} checkedKing={position.checkedKing} selected={held} />
      <MarkersLayer
        orientation={orientation}
        options={held ? (position.legal.get(held) ?? NO_OPTIONS) : NO_OPTIONS}
        hover={state.kind === 'dragging' ? state.hover : null}
      />
      <Coordinates orientation={orientation} />
      <GhostsLayer orientation={orientation} ghosts={ghosts} />
      <PiecesLayer
        orientation={orientation}
        board={board}
        grabbable={grabbable}
        lifted={state.kind === 'dragging' ? state.from : null}
      />
      {dragged && (
        <div ref={draggedRef} className="piece piece--dragged" style={{ backgroundImage: `url("${pieceUrl(dragged)}")` }} data-testid="dragged" />
      )}
      {promoting && (
        <PromotionPicker
          to={promoting.to}
          color={position.turn}
          orientation={orientation}
          onChoose={(piece) => send({ type: 'choosePromotion', piece })}
        />
      )}
    </div>
  );
}
