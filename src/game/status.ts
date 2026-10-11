import { opponent, type Color } from '../rules/types';
import { DEFAULT_NAMES } from './defaults';
import type { EndReason, GameState, Result, Setup } from './types';

const COLOR_WORD: Record<Color, string> = { w: 'White', b: 'Black' };

export function colorWord(color: Color): string {
  return COLOR_WORD[color];
}

/** `White`, or `Alice (White)` for a custom name. */
export function label(setup: Setup, color: Color): string {
  const name = setup.names[color];
  return name === DEFAULT_NAMES[color] ? COLOR_WORD[color] : `${name} (${COLOR_WORD[color]})`;
}

export interface StatusLines {
  primary: string;
  secondary: string | null;
}

export function statusLines(state: GameState): StatusLines {
  const { setup, drawOffer } = state.record;
  const turn = state.position.turn;
  const result = state.result;

  if (result) {
    return {
      primary: result.winner === null ? 'Draw' : `${label(setup, result.winner)} wins`,
      secondary: reasonText(setup, result),
    };
  }

  if (drawOffer.state === 'pending') {
    return {
      primary: `${label(setup, drawOffer.by)} offers a draw`,
      secondary: `${label(setup, opponent(drawOffer.by))}, accept or decline`,
    };
  }

  const notes = [state.position.inCheck ? 'Check' : null, drawOffer.state === 'declined' ? 'Draw offer declined' : null];
  const secondary = notes.filter((n) => n !== null).join(' · ');
  return { primary: `${label(setup, turn)} to move`, secondary: secondary || null };
}

function reasonText(setup: Setup, result: Result): string {
  const reason: EndReason = result.reason;
  switch (reason) {
    case 'checkmate':
      return 'by checkmate';
    case 'resignation':
      return `${label(setup, opponent(result.winner ?? 'w'))} resigned`;
    case 'stalemate':
      return 'by stalemate';
    case 'threefold':
      return 'by threefold repetition';
    case 'fiftyMove':
      return 'by the fifty-move rule';
    case 'insufficientMaterial':
      return 'by insufficient material';
    case 'agreement':
      return 'by agreement';
    default:
      return reason satisfies never;
  }
}

export type Badge = 'To move' | 'Winner' | 'Draw';

export function badge(state: GameState, color: Color): Badge | null {
  const result = state.result;
  if (!result) return state.position.turn === color ? 'To move' : null;
  if (result.winner === null) return 'Draw';
  return result.winner === color ? 'Winner' : null;
}

/** Highlighted plate: the side to move, in progress only. */
export function isActivePlate(state: GameState, color: Color): boolean {
  return state.result === null && state.position.turn === color;
}

export function scoreText(result: Result): string {
  if (result.winner === null) return '½-½';
  return result.winner === 'w' ? '1-0' : '0-1';
}

export function resignPrompt(state: GameState): string {
  return `${label(state.record.setup, state.position.turn)}, resign this game?`;
}

export function abandonText(setup: Setup): string {
  return `The game between ${label(setup, 'w')} and ${label(setup, 'b')} will be lost.`;
}
