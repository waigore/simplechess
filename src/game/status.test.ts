import { describe, expect, it } from 'vitest';
import { createGameStore } from './gameStore';
import { defaultSetup } from './defaults';
import { abandonText, badge, colorWord, isActivePlate, label, resignPrompt, scoreText, statusLines } from './status';
import { LINES, sanToMoves } from '../test/fixtures';
import type { GameState, Result, Setup } from './types';

const plain = defaultSetup();
const named: Setup = { ...plain, names: { w: 'Alice', b: 'Bob' } };

function stateAfter(sans: readonly string[], setup: Setup = plain, act?: (s: ReturnType<typeof createGameStore>) => void) {
  const store = createGameStore();
  store.newGame(setup);
  for (const move of sanToMoves(sans)) store.move(move);
  act?.(store);
  return store.getState();
}

const withResult = (result: Result, setup: Setup = plain): GameState => {
  const state = stateAfter([], setup);
  return { ...state, result, underway: false };
};

describe('label', () => {
  it('uses the color alone for default names and "Name (Color)" otherwise', () => {
    expect(label(plain, 'w')).toBe('White');
    expect(label(plain, 'b')).toBe('Black');
    expect(label(named, 'w')).toBe('Alice (White)');
    expect(label(named, 'b')).toBe('Bob (Black)');
    expect(label({ ...plain, names: { w: 'Black', b: 'White' } }, 'w')).toBe('Black (White)');
    expect(colorWord('b')).toBe('Black');
  });
});

describe('statusLines', () => {
  it('names the side to move', () => {
    expect(statusLines(stateAfter([]))).toEqual({ primary: 'White to move', secondary: null });
    expect(statusLines(stateAfter(['e4'], named))).toEqual({ primary: 'Bob (Black) to move', secondary: null });
  });

  it('adds Check', () => {
    expect(statusLines(stateAfter(LINES.R06))).toEqual({ primary: 'Black to move', secondary: 'Check' });
  });

  it('shows a pending offer', () => {
    expect(statusLines(stateAfter(['e4', 'e5'], named, (s) => s.offerDraw()))).toEqual({
      primary: 'Alice (White) offers a draw',
      secondary: 'Bob (Black), accept or decline',
    });
  });

  it('shows a declined offer until the next move', () => {
    const declined = stateAfter(['e4', 'e5'], named, (s) => {
      s.offerDraw();
      s.declineDraw();
    });
    expect(statusLines(declined)).toEqual({ primary: 'Alice (White) to move', secondary: 'Draw offer declined' });
  });

  it('combines check and a declined offer (E-10)', () => {
    const state = stateAfter(LINES.R06, plain, (s) => {
      s.offerDraw();
      s.declineDraw();
    });
    expect(statusLines(state)).toEqual({ primary: 'Black to move', secondary: 'Check · Draw offer declined' });
  });

  it.each([
    [{ winner: 'b', reason: 'checkmate' }, 'Black wins', 'by checkmate'],
    [{ winner: 'w', reason: 'resignation' }, 'White wins', 'Black resigned'],
    [{ winner: null, reason: 'stalemate' }, 'Draw', 'by stalemate'],
    [{ winner: null, reason: 'threefold' }, 'Draw', 'by threefold repetition'],
    [{ winner: null, reason: 'fiftyMove' }, 'Draw', 'by the fifty-move rule'],
    [{ winner: null, reason: 'insufficientMaterial' }, 'Draw', 'by insufficient material'],
    [{ winner: null, reason: 'agreement' }, 'Draw', 'by agreement'],
  ] as const)('shows the result %j', (result, primary, secondary) => {
    expect(statusLines(withResult(result))).toEqual({ primary, secondary });
  });

  it('uses custom names in results', () => {
    expect(statusLines(stateAfter(['e4'], named, (s) => s.resign()))).toEqual({
      primary: 'Alice (White) wins',
      secondary: 'Bob (Black) resigned',
    });
  });

  it('reports a real checkmate over the check line', () => {
    expect(statusLines(stateAfter(LINES.E01))).toEqual({ primary: 'Black wins', secondary: 'by checkmate' });
  });
});

describe('badges and plates', () => {
  it('marks the side to move in progress', () => {
    const state = stateAfter(['e4']);
    expect(badge(state, 'b')).toBe('To move');
    expect(badge(state, 'w')).toBeNull();
    expect(isActivePlate(state, 'b')).toBe(true);
    expect(isActivePlate(state, 'w')).toBe(false);
  });

  it('marks the winner only, and no active plate, after a win', () => {
    const state = stateAfter(LINES.E01);
    expect(badge(state, 'b')).toBe('Winner');
    expect(badge(state, 'w')).toBeNull();
    expect(isActivePlate(state, 'w')).toBe(false);
    expect(isActivePlate(state, 'b')).toBe(false);
  });

  it('marks both plates Draw after a draw', () => {
    const state = withResult({ winner: null, reason: 'agreement' });
    expect(badge(state, 'w')).toBe('Draw');
    expect(badge(state, 'b')).toBe('Draw');
  });
});

describe('score and prompts', () => {
  it('formats the score', () => {
    expect(scoreText({ winner: 'w', reason: 'checkmate' })).toBe('1-0');
    expect(scoreText({ winner: 'b', reason: 'resignation' })).toBe('0-1');
    expect(scoreText({ winner: null, reason: 'stalemate' })).toBe('½-½');
  });

  it('builds the resign and abandon prompts', () => {
    expect(resignPrompt(stateAfter([]))).toBe('White, resign this game?');
    expect(resignPrompt(stateAfter(['e4'], named))).toBe('Bob (Black), resign this game?');
    expect(abandonText(named)).toBe('The game between Alice (White) and Bob (Black) will be lost.');
    expect(abandonText(plain)).toBe('The game between White and Black will be lost.');
  });
});
