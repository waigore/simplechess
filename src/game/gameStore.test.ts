import { describe, expect, it, vi } from 'vitest';
import { createGameStore } from './gameStore';
import { defaultSetup } from './defaults';
import { LINES, sanToMoves } from '../test/fixtures';
import type { Setup } from './types';

const named: Setup = { ...defaultSetup(), names: { w: 'Alice', b: 'Bob' } };

function storeAfter(sans: readonly string[]) {
  const store = createGameStore();
  for (const move of sanToMoves(sans)) store.move(move);
  return store;
}

describe('createGameStore', () => {
  it('starts with the default setup and the start position', () => {
    const state = createGameStore().getState();
    expect(state.record).toEqual({ setup: defaultSetup(), moves: [], termination: null, drawOffer: { state: 'none' } });
    expect(state.position.turn).toBe('w');
    expect(state.history).toEqual([]);
    expect(state.lastMove).toBeNull();
    expect(state.result).toBeNull();
    expect(state.underway).toBe(false);
  });

  it('appends a legal move and refuses an illegal one', () => {
    const store = createGameStore();
    const before = store.getState();
    expect(store.move({ from: 'e2', to: 'e5' })).toBeNull();
    expect(store.getState()).toBe(before);
    expect(store.move({ from: 'e2', to: 'e4' })?.san).toBe('e4');
    const state = store.getState();
    expect(state.record.moves).toEqual([{ from: 'e2', to: 'e4' }]);
    expect(state.history.map((d) => d.san)).toEqual(['e4']);
    expect(state.lastMove).toEqual({ from: 'e2', to: 'e4' });
    expect(state.position.turn).toBe('b');
    expect(state.underway).toBe(true);
  });

  it('newGame resets everything', () => {
    const store = storeAfter(['e4', 'e5']);
    store.offerDraw();
    store.newGame(named);
    const state = store.getState();
    expect(state.record).toEqual({ setup: named, moves: [], termination: null, drawOffer: { state: 'none' } });
    expect(state.history).toEqual([]);
    expect(state.position.turn).toBe('w');
    expect(state.underway).toBe(false);
  });

  it('ends on checkmate and refuses further moves', () => {
    const store = storeAfter(LINES.E01);
    const state = store.getState();
    expect(state.result).toEqual({ winner: 'b', reason: 'checkmate' });
    expect(state.underway).toBe(false);
    expect(store.move({ from: 'a2', to: 'a3' })).toBeNull();
    store.resign();
    store.offerDraw();
    expect(store.getState()).toBe(state);
  });

  it.each([
    ['stalemate', LINES.E02],
    ['threefold', LINES.E03],
  ] as const)('reports %s as a draw', (reason, line) => {
    expect(storeAfter(line).getState().result).toEqual({ winner: null, reason });
  });
});

describe('resignation', () => {
  it('lets White resign before the first move', () => {
    const store = createGameStore();
    store.resign();
    const state = store.getState();
    expect(state.result).toEqual({ winner: 'b', reason: 'resignation' });
    expect(state.record.termination).toEqual({ kind: 'resignation', by: 'w' });
    expect(state.position.legal.size).toBe(0);
    expect(state.underway).toBe(false);
  });

  it('lets Black resign after 1. e4', () => {
    const store = storeAfter(['e4']);
    store.resign();
    expect(store.getState().result).toEqual({ winner: 'w', reason: 'resignation' });
  });

  it('is refused while a draw offer is pending', () => {
    const store = storeAfter(['e4']);
    store.offerDraw();
    store.resign();
    expect(store.getState().result).toBeNull();
  });
});

describe('draw offers', () => {
  it('locks moves while pending, then ends by agreement on accept', () => {
    const store = storeAfter(['e4', 'e5']);
    store.offerDraw();
    expect(store.getState().record.drawOffer).toEqual({ state: 'pending', by: 'w' });
    expect(store.move({ from: 'g1', to: 'f3' })).toBeNull();
    store.offerDraw();
    expect(store.getState().record.drawOffer).toEqual({ state: 'pending', by: 'w' });
    store.acceptDraw();
    const state = store.getState();
    expect(state.result).toEqual({ winner: null, reason: 'agreement' });
    expect(state.record.drawOffer).toEqual({ state: 'none' });
    expect(state.position.legal.size).toBe(0);
  });

  it('blocks a re-offer by the declined side until the next move', () => {
    const store = storeAfter(['e4', 'e5']);
    store.offerDraw();
    store.declineDraw();
    expect(store.getState().record.drawOffer).toEqual({ state: 'declined', by: 'w' });
    expect(store.getState().result).toBeNull();
    store.offerDraw();
    expect(store.getState().record.drawOffer.state).toBe('declined');

    store.move({ from: 'g1', to: 'f3' });
    expect(store.getState().record.drawOffer).toEqual({ state: 'none' });
    store.offerDraw();
    expect(store.getState().record.drawOffer).toEqual({ state: 'pending', by: 'b' });
  });

  it('ignores accept and decline with no pending offer', () => {
    const store = createGameStore();
    const before = store.getState();
    store.acceptDraw();
    store.declineDraw();
    expect(store.getState()).toBe(before);
  });
});

describe('store mechanics', () => {
  it('rebuilds the same state from a record', () => {
    const live = storeAfter(LINES.L01.slice(0, 12));
    const restored = createGameStore(live.getState().record);
    const a = live.getState();
    const b = restored.getState();
    expect(b.position).toEqual(a.position);
    expect(b.history).toEqual(a.history);
    expect(b.lastMove).toEqual(a.lastMove);
  });

  it('throws on a corrupt record', () => {
    const record = { ...createGameStore().getState().record, moves: [{ from: 'e2' as const, to: 'e5' as const }] };
    expect(() => createGameStore(record)).toThrow(/Corrupt/);
  });

  it('keeps state identity stable and notifies once per change', () => {
    const store = createGameStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.getState()).toBe(store.getState());
    store.move({ from: 'e2', to: 'e4' });
    expect(listener).toHaveBeenCalledTimes(1);
    const history = store.getState().history;
    store.offerDraw();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState().history).toBe(history);
    unsubscribe();
    store.declineDraw();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
