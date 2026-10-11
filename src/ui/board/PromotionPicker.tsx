import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { squareCell } from '../../interaction/geometry';
import { PICKER_ATTR } from '../../interaction/useBoardPointer';
import type { Color, PromotionPiece, Square } from '../../rules/types';
import { pieceUrl } from './pieceAssets';

/** From the promotion square toward the center of the board. */
export const PROMOTION_ORDER: readonly PromotionPiece[] = ['q', 'n', 'r', 'b'];

const NAMES: Record<PromotionPiece, string> = { q: 'queen', n: 'knight', r: 'rook', b: 'bishop' };

interface PromotionPickerProps {
  to: Square;
  color: Color;
  orientation: Color;
  onChoose: (piece: PromotionPiece) => void;
}

/**
 * The dim overlay is a plain board target: a press on it reaches the board's pointer handling, which cancels.
 * Presses on the cells are left to the buttons.
 */
export function PromotionPicker({ to, color, orientation, onChoose }: PromotionPickerProps) {
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    cells.current[0]?.focus();
  }, []);

  const { col, row } = squareCell(to, orientation);
  const step = row === 0 ? 1 : -1;

  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key !== 'Tab') return;
    const last = PROMOTION_ORDER.length - 1;
    const at = cells.current.indexOf(document.activeElement as HTMLButtonElement);
    const wrapTo = ev.shiftKey ? (at === 0 ? last : null) : at === last ? 0 : null;
    if (wrapTo === null) return;
    ev.preventDefault();
    cells.current[wrapTo]?.focus();
  };

  return (
    <>
      <div className="picker-dim" data-testid="picker-dim" />
      <div role="group" aria-label="Promotion" {...{ [PICKER_ATTR]: '' }} onKeyDown={onKeyDown}>
        {PROMOTION_ORDER.map((type, i) => (
          <button
            key={type}
            ref={(el) => {
              cells.current[i] = el;
            }}
            type="button"
            className="picker-cell"
            aria-label={`Promote to ${NAMES[type]}`}
            style={{
              left: `${col * 12.5}%`,
              top: `${(row + step * i) * 12.5}%`,
              backgroundImage: `url("${pieceUrl({ color, type })}")`,
            }}
            onClick={() => onChoose(type)}
          />
        ))}
      </div>
    </>
  );
}
