import { describe, expect, it } from 'vitest';
import { RulesGame, START_FEN } from './rulesGame';
import type { MoveDetail, MoveInput, Square } from './types';
import { LINES, sanToMoves } from '../test/fixtures';

const at = (sans: readonly string[]) => RulesGame.replay(sanToMoves(sans));
const dests = (game: RulesGame, from: Square) => (game.view().legal.get(from) ?? []).map((o) => o.to).sort();
const playAll = (game: RulesGame, moves: readonly MoveInput[]) => moves.map((m) => game.play(m));

describe('legal moves', () => {
  it('has 20 moves from the start, only for White', () => {
    const view = RulesGame.replay([]).view();
    const count = [...view.legal.values()].reduce((n, options) => n + options.length, 0);
    expect(count).toBe(20);
    expect(view.fen).toBe(START_FEN);
    expect(view.turn).toBe('w');
    expect(dests(RulesGame.replay([]), 'e2')).toEqual(['e3', 'e4']);
    expect(dests(RulesGame.replay([]), 'g1')).toEqual(['f3', 'h3']);
    expect([...view.legal.keys()].every((sq) => view.board.get(sq)?.color === 'w')).toBe(true);
  });

  it('refuses illegal moves without changing the position', () => {
    const game = RulesGame.replay([]);
    const fen = game.view().fen;
    expect(game.play({ from: 'e2', to: 'e5' })).toBeNull();
    expect(game.play({ from: 'b1', to: 'b3' })).toBeNull();
    expect(game.play({ from: 'e7', to: 'e5' })).toBeNull();
    expect(game.play({ from: 'e4', to: 'e5' })).toBeNull();
    expect(game.play({ from: 'e2', to: 'e4', promotion: 'q' })).toBeNull();
    expect(game.view().fen).toBe(fen);
  });

  it('gives a pinned knight no moves (R-07)', () => {
    const game = at(LINES.R07);
    expect(game.view().legal.has('c3')).toBe(false);
    expect(game.play({ from: 'c3', to: 'd5' })).toBeNull();
  });

  it('allows only g7-g6 out of check (R-06)', () => {
    const game = at(LINES.R06);
    const view = game.view();
    expect(view.inCheck).toBe(true);
    expect(view.checkedKing).toBe('e8');
    expect([...view.legal.entries()].map(([from, o]) => [from, o.map((x) => x.to)])).toEqual([['g7', ['g6']]]);
  });
});

describe('castling', () => {
  it('castles kingside for both colors (R-01)', () => {
    const game = at(LINES.R01);
    expect(dests(game, 'e1')).toContain('g1');
    const white = game.play({ from: 'e1', to: 'g1' });
    expect(white).toMatchObject({ san: 'O-O', piece: 'k', rook: { from: 'h1', to: 'f1' } });
    game.play({ from: 'g8', to: 'f6' });
    game.play({ from: 'd2', to: 'd3' });
    const black = game.play({ from: 'e8', to: 'g8' });
    expect(black).toMatchObject({ san: 'O-O', color: 'b', rook: { from: 'h8', to: 'f8' } });
    const board = game.view().board;
    expect(board.get('g1')?.type).toBe('k');
    expect(board.get('f1')?.type).toBe('r');
    expect(board.get('g8')?.type).toBe('k');
    expect(board.get('f8')?.type).toBe('r');
  });

  it('castles queenside for both colors (R-02)', () => {
    const game = at(LINES.R02);
    expect(game.play({ from: 'e1', to: 'c1' })).toMatchObject({ san: 'O-O-O', rook: { from: 'a1', to: 'd1' } });
    expect(game.play({ from: 'e8', to: 'c8' })).toMatchObject({ san: 'O-O-O', rook: { from: 'a8', to: 'd8' } });
  });

  it('refuses castling when blocked (R-03)', () => {
    const game = RulesGame.replay([]);
    expect(game.view().legal.has('e1')).toBe(false);
    expect(game.play({ from: 'e1', to: 'g1' })).toBeNull();
  });

  it('refuses castling through check (R-04)', () => {
    const game = at(LINES.R04);
    expect(game.view().inCheck).toBe(false);
    expect(dests(game, 'e1')).not.toContain('g1');
    expect(game.play({ from: 'e1', to: 'g1' })).toBeNull();
  });
});

describe('en passant (R-05)', () => {
  it('marks the empty square as a capture and removes the passed pawn', () => {
    const game = at(LINES.R05);
    expect(game.view().legal.get('e5')).toContainEqual({ to: 'd6', capture: true, promotion: false });
    expect(game.view().legal.get('e5')).toContainEqual({ to: 'e6', capture: false, promotion: false });
    const detail = game.play({ from: 'e5', to: 'd6' });
    expect(detail).toMatchObject({ san: 'exd6', captured: { square: 'd5', piece: { color: 'b', type: 'p' } } });
    expect(game.view().board.has('d5')).toBe(false);
  });
});

describe('promotion', () => {
  it('collapses the four promotion moves into one option', () => {
    const options = at(LINES.PROMO_WHITE).view().legal.get('b7');
    expect(options).toEqual(
      expect.arrayContaining([
        { to: 'a8', capture: true, promotion: true },
        { to: 'b8', capture: false, promotion: true },
      ]),
    );
    expect(options?.filter((o) => o.to === 'a8')).toHaveLength(1);
  });

  it('requires a promotion piece', () => {
    expect(at(LINES.PROMO_WHITE).play({ from: 'b7', to: 'b8' })).toBeNull();
  });

  it.each([
    ['a8', 'q', 'bxa8=Q'],
    ['a8', 'n', 'bxa8=N'],
    ['b8', 'r', 'b8=R'],
    ['b8', 'b', 'b8=B'],
  ] as const)('promotes b7-%s to %s as %s', (to, promotion, san) => {
    const game = at(LINES.PROMO_WHITE);
    const detail = game.play({ from: 'b7', to, promotion });
    expect(detail).toMatchObject({ san, promotion, piece: 'p' });
    expect(game.view().board.get(to)).toEqual({ color: 'w', type: promotion });
    if (to === 'a8') expect(detail?.captured).toEqual({ square: 'a8', piece: { color: 'b', type: 'r' } });
  });

  it('promotes for Black (P-07)', () => {
    const game = at(LINES.PROMO_BLACK);
    expect(game.play({ from: 'b2', to: 'a1', promotion: 'q' })).toMatchObject({ san: 'bxa1=Q', color: 'b' });
  });
});

describe('endings', () => {
  it('detects checkmate (E-01)', () => {
    const view = at(LINES.E01).view();
    expect(view.outcome).toEqual({ kind: 'checkmate', winner: 'b' });
    expect(view.checkedKing).toBe('e1');
    expect(view.legal.size).toBe(0);
  });

  it('detects stalemate (E-02)', () => {
    expect(at(LINES.E02.slice(0, -1)).view().outcome).toBeNull();
    expect(at(LINES.E02).view().outcome).toEqual({ kind: 'stalemate' });
  });

  it('detects threefold repetition only on the last move (E-03)', () => {
    expect(at(LINES.E03.slice(0, -1)).view().outcome).toBeNull();
    expect(at(LINES.E03).view().outcome).toEqual({ kind: 'threefold' });
  });

  it('detects insufficient material (E-04)', () => {
    expect(at(LINES.E04.slice(0, -1)).view().outcome).toBeNull();
    expect(at(LINES.E04).view().outcome).toEqual({ kind: 'insufficientMaterial' });
  });

  it('detects the fifty-move rule over a full game only on the last move (E-05b)', () => {
    const moves = sanToMoves(LINES.E05B);
    const game = RulesGame.replay(moves.slice(0, -1));
    expect(game.view().halfmoveClock).toBe(99);
    expect(game.view().outcome).toBeNull();
    game.play(moves.at(-1)!);
    expect(game.view().outcome).toEqual({ kind: 'fiftyMove' });
  });
});

describe('fifty-move rule from half-move clock 99 (E-05a)', () => {
  const FEN_99 = '4k3/8/8/8/8/8/8/R3K3 w - - 99 80';

  it('draws by the fifty-move rule after one quiet move at half-move clock 99', () => {
    const game = RulesGame.replay([], FEN_99);
    expect(game.view().halfmoveClock).toBe(99);
    expect(game.view().outcome).toBeNull();
    expect(game.play({ from: 'a1', to: 'a2' })).not.toBeNull();
    expect(game.view().halfmoveClock).toBe(100);
    expect(game.view().outcome).toEqual({ kind: 'fiftyMove' });
  });

  it('does not draw after a pawn move or capture at half-move clock 99', () => {
    const pawn = RulesGame.replay([], '4k3/8/8/8/8/8/P7/4K3 w - - 99 80');
    pawn.play({ from: 'a2', to: 'a3' });
    expect(pawn.view().outcome).toBeNull();

    const capture = RulesGame.replay([], '4k3/8/8/8/8/8/p7/R3K3 w - - 99 80');
    capture.play({ from: 'a1', to: 'a2' });
    expect(capture.view().halfmoveClock).toBe(0);
    expect(capture.view().outcome).toBeNull();
  });

  it('scores a mating 100th half-move as checkmate, not a fifty-move draw', () => {
    const game = RulesGame.replay([], '7k/8/6K1/8/8/8/8/R7 w - - 99 80');
    expect(game.play({ from: 'a1', to: 'a8' })?.san).toBe('Ra8#');
    expect(game.view().outcome).toEqual({ kind: 'checkmate', winner: 'w' });
  });
});

describe('SAN and replay', () => {
  it('produces the exact SAN of the sample game (L-01)', () => {
    const game = RulesGame.replay([]);
    const details = playAll(game, sanToMoves(LINES.L01));
    expect(details.map((d) => d?.san)).toEqual(LINES.L01);
    expect(game.view().outcome).toEqual({ kind: 'checkmate', winner: 'w' });
  });

  it('gives the same position and history whether replayed or played move by move (E-04)', () => {
    const moves = sanToMoves(LINES.E04);
    const live = RulesGame.replay([]);
    const history = playAll(live, moves) as MoveDetail[];
    const replayed = RulesGame.replay(moves);
    expect(replayed.view()).toEqual(live.view());
    expect(history.map((d) => d.san)).toEqual(LINES.E04);
  });

  it('throws on a corrupt record', () => {
    expect(() => RulesGame.replay([{ from: 'e2', to: 'e5' }])).toThrow(/ply 1/);
  });

  it('caches the view until a move is played', () => {
    const game = RulesGame.replay([]);
    const first = game.view();
    expect(game.view()).toBe(first);
    game.play({ from: 'e2', to: 'e4' });
    expect(game.view()).not.toBe(first);
  });
});
