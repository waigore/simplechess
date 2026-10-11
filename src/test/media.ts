/** A controllable `window.matchMedia` for jsdom, which has none. */

class FakeMediaQueryList extends EventTarget {
  matches = false;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null;
  constructor(readonly media: string) {
    super();
  }
  addListener(listener: (ev: Event) => void) {
    this.addEventListener('change', listener);
  }
  removeListener(listener: (ev: Event) => void) {
    this.removeEventListener('change', listener);
  }
}

const lists = new Map<string, FakeMediaQueryList>();

function list(query: string): FakeMediaQueryList {
  let found = lists.get(query);
  if (!found) lists.set(query, (found = new FakeMediaQueryList(query)));
  return found;
}

export function installMatchMedia() {
  window.matchMedia = (query: string) => list(query) as unknown as MediaQueryList;
}

export function setMediaQuery(query: string, matches: boolean) {
  const found = list(query);
  if (found.matches === matches) return;
  found.matches = matches;
  found.dispatchEvent(Object.assign(new Event('change'), { matches, media: query }));
}

export function resetMediaQueries() {
  lists.clear();
}

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
