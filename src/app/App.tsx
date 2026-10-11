import { useState, useSyncExternalStore } from 'react';
import { createGameStore } from '../game/gameStore';
import { statusLines } from '../game/status';

export function App() {
  const [store] = useState(() => createGameStore());
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const status = statusLines(state);

  return (
    <main>
      <div aria-live="polite">
        <p>{status.primary}</p>
        {status.secondary && <p>{status.secondary}</p>}
      </div>
    </main>
  );
}
