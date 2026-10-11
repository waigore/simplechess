import { EASE } from './constants';
import { slideOffset } from './plan';
import type { BoardFrame, Tween } from './plan';

export interface Animator {
  /**
   * Finishes any running batch, then starts `tweens`. `onSettled` runs exactly once: when every tween has
   * finished, from `finishAll()`, or right away when nothing starts.
   */
  run(tweens: Tween[], resolve: (t: Tween) => HTMLElement | null, onSettled: () => void): void;
  /** Jumps every running tween to its end state and calls the pending `onSettled` now. */
  finishAll(): void;
}

interface Running {
  animation: Animation;
  element: HTMLElement;
  tween: Tween;
}

interface Batch {
  running: Running[];
  left: number;
  onSettled: () => void;
  settled: boolean;
}

/**
 * Slides animate `transform` only, so piece elements must be positioned without it (for example with left/top).
 * `frame` is read once per batch that contains a slide.
 */
export function createAnimator(frame: () => BoardFrame): Animator {
  let batch: Batch | null = null;

  function settle(b: Batch) {
    if (b.settled) return;
    b.settled = true;
    if (batch === b) batch = null;
    b.onSettled();
  }

  /** A faded ghost stays hidden after its tween until React removes it. */
  function landed({ element, tween }: Running) {
    if (tween.kind === 'fade') element.style.opacity = '0';
  }

  function finishAll() {
    const b = batch;
    if (!b) return;
    for (const r of [...b.running]) {
      landed(r);
      r.animation.finish();
    }
    settle(b);
  }

  function start(element: HTMLElement, tween: Tween, f: BoardFrame | null): Animation {
    if (tween.kind === 'fade') {
      return element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: tween.duration, easing: 'linear' });
    }
    const { x, y } = slideOffset(tween.square, tween.from, f as BoardFrame);
    return element.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0px, 0px)' }], {
      duration: tween.duration,
      easing: EASE,
    });
  }

  function run(tweens: Tween[], resolve: (t: Tween) => HTMLElement | null, onSettled: () => void) {
    finishAll();
    const f = tweens.some((t) => t.kind === 'slide') ? frame() : null;
    const running: Running[] = [];
    for (const tween of tweens) {
      const element = resolve(tween);
      if (element) running.push({ animation: start(element, tween, f), element, tween });
    }
    const b: Batch = { running, left: running.length, onSettled, settled: false };
    if (running.length === 0) {
      settle(b);
      return;
    }
    batch = b;
    for (const r of running) {
      r.animation.addEventListener('finish', () => {
        landed(r);
        b.left -= 1;
        if (b.left === 0) settle(b);
      });
    }
  }

  return { run, finishAll };
}
