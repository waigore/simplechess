import type { Color, MoveOption, Square } from '../../rules/types';
import { cellStyle } from './cells';

interface MarkersLayerProps {
  orientation: Color;
  options: readonly MoveOption[];
  /** Legal square under a dragged piece; its tint replaces the dot or ring. */
  hover: Square | null;
}

function markerClass(option: MoveOption, hover: Square | null): string {
  if (option.to === hover) return 'marker--hover';
  return option.capture ? 'marker--ring' : 'marker--dot';
}

export function MarkersLayer({ orientation, options, hover }: MarkersLayerProps) {
  return (
    <div className="board-layer">
      {options.map((option) => (
        <div
          key={option.to}
          data-marker={option.to}
          className={`board-cell ${markerClass(option, hover)}`}
          style={cellStyle(option.to, orientation)}
        />
      ))}
    </div>
  );
}
