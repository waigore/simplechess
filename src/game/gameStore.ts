import { RulesGame } from '../rules/rulesGame';
import { opponent, type MoveDetail, type MoveInput, type PositionView } from '../rules/types';
import { defaultSetup } from './defaults';
import type { DrawOffer, GameRecord, GameState, Result, Setup } from './types';

export interface GameStore {
  /** Same object until the next change. */
  getState(): GameState;
  subscribe(listener: () => void): () => void;
  newGame(setup: Setup): void;
  move(input: MoveInput): MoveDetail | null;
  /** The side to move resigns. */
  resign(): void;
  /** The side to move offers a draw. */
  offerDraw(): void;
  acceptDraw(): void;
  declineDraw(): void;
}

const NO_OFFER: DrawOffer = { state: 'none' };

export function createGameStore(initial?: GameRecord): GameStore {
  let rules: RulesGame;
  let state: GameState;
  const listeners = new Set<() => void>();

  function deriveResult(position: PositionView, record: GameRecord): Result | null {
    const outcome = position.outcome;
    if (outcome) return { winner: outcome.kind === 'checkmate' ? outcome.winner : null, reason: outcome.kind };
    const t = record.termination;
    if (t?.kind === 'resignation') return { winner: opponent(t.by), reason: 'resignation' };
    if (t?.kind === 'agreement') return { winner: null, reason: 'agreement' };
    return null;
  }

  function build(record: GameRecord, history: readonly MoveDetail[]): GameState {
    const view = rules.view();
    const result = deriveResult(view, record);
    const last = history.at(-1);
    return {
      record,
      // A game ended by resignation or agreement has nothing left to pick up.
      position: result && view.legal.size > 0 ? { ...view, legal: new Map() } : view,
      history,
      lastMove: last ? { from: last.from, to: last.to } : null,
      result,
      underway: history.length > 0 && result === null,
    };
  }

  function emit(next: GameState): void {
    state = next;
    listeners.forEach((listener) => listener());
  }

  function updateRecord(patch: Partial<GameRecord>): void {
    emit(build({ ...state.record, ...patch }, state.history));
  }

  function load(record: GameRecord): GameState {
    const history: MoveDetail[] = [];
    rules = RulesGame.replay([]);
    for (const move of record.moves) {
      const detail = rules.play(move);
      if (!detail) throw new Error(`Corrupt game record at ${move.from}-${move.to}`);
      history.push(detail);
    }
    return build(record, history);
  }

  state = load(initial ?? { setup: defaultSetup(), moves: [], termination: null, drawOffer: NO_OFFER });

  const inProgress = () => state.result === null;

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    newGame(setup) {
      emit(load({ setup, moves: [], termination: null, drawOffer: NO_OFFER }));
    },
    move(input) {
      if (!inProgress() || state.record.drawOffer.state === 'pending') return null;
      const detail = rules.play(input);
      if (!detail) return null;
      const record: GameRecord = { ...state.record, moves: [...state.record.moves, input], drawOffer: NO_OFFER };
      emit(build(record, [...state.history, detail]));
      return detail;
    },
    resign() {
      if (!inProgress() || state.record.drawOffer.state === 'pending') return;
      updateRecord({ termination: { kind: 'resignation', by: state.position.turn } });
    },
    offerDraw() {
      const offer = state.record.drawOffer;
      const turn = state.position.turn;
      if (!inProgress() || offer.state === 'pending' || (offer.state === 'declined' && offer.by === turn)) return;
      updateRecord({ drawOffer: { state: 'pending', by: turn } });
    },
    acceptDraw() {
      if (!inProgress() || state.record.drawOffer.state !== 'pending') return;
      updateRecord({ termination: { kind: 'agreement' }, drawOffer: NO_OFFER });
    },
    declineDraw() {
      const offer = state.record.drawOffer;
      if (!inProgress() || offer.state !== 'pending') return;
      updateRecord({ drawOffer: { state: 'declined', by: offer.by } });
    },
  };
}
