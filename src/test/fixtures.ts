import { RulesGame } from '../rules/rulesGame';
import type { MoveInput, PieceType, PromotionPiece } from '../rules/types';

/** Move lines from docs/playtest/epic-a-untimed.md, so unit tests and the playtest use the same games. */
const line = (text: string): string[] => text.split(/\s+/).filter((t) => t !== '' && !/^\d+\.$/.test(t));

export const LINES = {
  R01: line('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5'),
  R02: line('1. d4 d5 2. Nc3 Nc6 3. Bf4 Bf5 4. Qd2 Qd7'),
  R04: line('1. e4 b6 2. g3 Ba6 3. Bg2 Nc6 4. Nf3 Nf6'),
  R05: line('1. e4 a6 2. e5 d5'),
  R06: line('1. e4 f6 2. Qh5+'),
  R07: line('1. e4 e5 2. Nc3 Nf6 3. d3 Bb4'),
  PROMO_WHITE: line('1. a4 b5 2. axb5 a6 3. bxa6 Bb7 4. axb7 Nc6'),
  PROMO_BLACK: line('1. b4 a5 2. Bb2 axb4 3. Nc3 bxc3 4. e3 cxb2 5. Nf3'),
  E01: line('1. f3 e5 2. g4 Qh4#'),
  E02: line(
    '1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. h4 Rah6 5. Qxc7 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6',
  ),
  E03: line('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8'),
  E04: line(
    '1. d3 a5 2. Bf4 e6 3. Bxc7 Qxc7 4. g4 Qxh2 5. Rxh2 Ba3 6. Rxh7 Bxb2 7. Rxg7 Bxg7 8. Nf3 Bxa1 9. Nbd2 Rh7 ' +
      '10. Qxa1 Rh1 11. Ng5 Rxf1+ 12. Kxf1 Ra7 13. Nxe6 dxe6 14. f4 Ra6 15. Qc1 e5 16. fxe5 Bxg4 17. e6 Bxe6 ' +
      '18. Qb1 Bxa2 19. Qxb7 Nh6 20. Qxf7+ Bxf7 21. c3 Bg6 22. Kg1 Bxd3 23. exd3 Nc6 24. d4 Nxd4 25. cxd4 Ra7 ' +
      '26. d5 Rh7 27. d6 a4 28. Kh2 a3 29. Nc4 Kf8 30. Nxa3 Rf7 31. Nb5 Rh7 32. d7 Rxd7 33. Nc7 Rxc7 34. Kg3 Ng8 ' +
      '35. Kg4 Rg7+ 36. Kh5 Rg6 37. Kxg6',
  ),
  E05B: line(
    '1. e4 e5 2. Qh5 Nc6 3. Ne2 Nb8 4. Qf3 Qe7 5. Qh5 Qb4 6. Kd1 Qb6 7. Qf3 Qf6 8. Qa3 Qc6 9. Qd3 Qc5 ' +
      '10. Qa6 Qb5 11. Ng1 Nh6 12. Qa4 Qc6 13. Qc4 Kd8 14. Ke1 Qa4 15. Qd5 Ng8 16. Qc6 Qa3 17. Kd1 Qd3 ' +
      '18. Qd6 Ke8 19. Qf6 Qd4 20. Qh6 Qe3 21. Be2 Ke7 22. Qf4 Kd8 23. Bf3 Qd4 24. Qg4 Qa4 25. Be2 Qd4 ' +
      '26. Qf5 Qd3 27. Bg4 Qd6 28. Ke2 Qc5 29. Qg6 Be7 30. Kd3 Na6 31. Be6 Qb4 32. Bb3 Qb6 33. Bd5 Qe6 ' +
      '34. Nh3 Qf5 35. Qg5 Qg4 36. Re1 Qh4 37. Qh5 Bb4 38. Rh1 Bf8 39. Rf1 Bd6 40. Nf4 Rb8 41. Rd1 Qf6 ' +
      '42. Na3 Qf5 43. Qg4 Ke8 44. Rb1 Qh5 45. Qg6 Ke7 46. Ke3 Ra8 47. Qh6 Bb4 48. Be6 Kd8 49. Rf1 Qg5 ' +
      '50. Qh5 Qf6 51. Bh3 Be7',
  ),
  L01: line(
    '1. e4 f5 2. exf5 g6 3. fxg6 Bg7 4. gxh7 Bf6 5. hxg8=Q+ Rxg8 6. Nf3 d6 7. Bc4 Nc6 8. O-O e6 9. Qe2 Kd7 10. Qxe6#',
  ),
} as const;

/**
 * Resolves SAN to `MoveInput` through `RulesGame`: candidates are filtered by piece and destination,
 * and when several remain each is tried on a replayed copy and kept only if the adapter's SAN matches.
 */
export function sanToMoves(sans: readonly string[], startFen?: string): MoveInput[] {
  const key = `${startFen ?? ''}|${sans.join(' ')}`;
  const cached = resolved.get(key);
  if (cached) return [...cached];
  const moves: MoveInput[] = [];
  const game = RulesGame.replay([], startFen);
  for (const san of sans) {
    const input = resolve(game, moves, san, startFen);
    if (game.play(input)?.san !== san) throw new Error(`SAN mismatch: expected ${san}`);
    moves.push(input);
  }
  resolved.set(key, moves);
  return [...moves];
}

const resolved = new Map<string, MoveInput[]>();

function resolve(game: RulesGame, moves: readonly MoveInput[], san: string, startFen?: string): MoveInput {
  const view = game.view();
  const bare = san.replace(/[+#]$/, '');
  const promotion = /=([QRBN])$/.exec(bare)?.[1]?.toLowerCase() as PromotionPiece | undefined;
  const castle = bare === 'O-O' ? 'g' : bare === 'O-O-O' ? 'c' : null;
  const rank = view.turn === 'w' ? '1' : '8';
  const to = castle ? `${castle}${rank}` : bare.replace(/=[QRBN]$/, '').slice(-2);
  const type: PieceType = castle ? 'k' : /^[KQRBN]/.test(bare) ? (bare[0]!.toLowerCase() as PieceType) : 'p';

  const candidates: MoveInput[] = [];
  for (const [from, options] of view.legal) {
    if (view.board.get(from)?.type !== type) continue;
    for (const option of options) {
      if (option.to === to) candidates.push(promotion ? { from, to: option.to, promotion } : { from, to: option.to });
    }
  }
  if (candidates.length === 1) return candidates[0]!;
  const match = candidates.find((c) => RulesGame.replay(moves, startFen).play(c)?.san === san);
  if (!match) throw new Error(`SAN not legal here: ${san}`);
  return match;
}
