import { describe, expect, it, vi } from 'vitest';
import type { StubAnimation } from '../test/animation';
import { createAnimator } from './animator';
import { COMMIT_MS, EASE, PUT_BACK_MS } from './constants';
import type { BoardFrame, Tween } from './plan';

const FRAME: BoardFrame = { rect: { left: 0, top: 0, width: 400, height: 400 }, orientation: 'w' };
const PAWN = { color: 'b', type: 'p' } as const;

const SLIDE: Tween = { kind: 'slide', square: 'e4', from: 'e2', duration: COMMIT_MS };
const FADE: Tween = { kind: 'fade', piece: PAWN, square: 'd5', duration: COMMIT_MS };
const ROOK: Tween = { kind: 'slide', square: 'f1', from: 'h1', duration: COMMIT_MS };

function setup() {
  const elements = new Map<string, HTMLElement>();
  const animations: StubAnimation[] = [];
  const resolve = vi.fn((t: Tween) => {
    let el = elements.get(t.square);
    if (!el) {
      el = document.createElement('div');
      const animate = el.animate.bind(el);
      el.animate = (...args) => {
        const a = animate(...args);
        animations.push(a as unknown as StubAnimation);
        return a;
      };
      elements.set(t.square, el);
    }
    return el;
  });
  const frame = vi.fn(() => FRAME);
  return { animator: createAnimator(frame), resolve, frame, elements, animations };
}

describe('createAnimator', () => {
  it('slides with a transform from the start square and the commit easing', () => {
    const { animator, resolve, animations } = setup();
    animator.run([SLIDE], resolve, () => {});
    expect(animations).toHaveLength(1);
    expect(animations[0]?.keyframes).toEqual([
      { transform: 'translate(0px, 100px)' },
      { transform: 'translate(0px, 0px)' },
    ]);
    expect(animations[0]?.options).toEqual({ duration: COMMIT_MS, easing: EASE });
  });

  it('slides from a drop point relative to the square center', () => {
    const { animator, resolve, animations } = setup();
    // g1 center is (325, 375) on a 400px board.
    animator.run([{ kind: 'slide', square: 'g1', from: { x: 300, y: 125 }, duration: PUT_BACK_MS }], resolve, () => {});
    expect(animations[0]?.keyframes[0]).toEqual({ transform: 'translate(-25px, -250px)' });
    expect(animations[0]?.options.duration).toBe(PUT_BACK_MS);
  });

  it('fades linearly and keeps the ghost hidden when it lands', () => {
    const { animator, resolve, animations, elements } = setup();
    animator.run([FADE], resolve, () => {});
    expect(animations[0]?.keyframes).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(animations[0]?.options).toEqual({ duration: COMMIT_MS, easing: 'linear' });
    expect(elements.get('d5')?.style.opacity).toBe('');
    animations[0]?.finish();
    expect(elements.get('d5')?.style.opacity).toBe('0');
  });

  it('settles once, after every tween in the batch finishes', () => {
    const { animator, resolve, animations } = setup();
    const settled = vi.fn();
    animator.run([SLIDE, FADE, ROOK], resolve, settled);
    animations[0]?.finish();
    animations[1]?.finish();
    expect(settled).not.toHaveBeenCalled();
    animations[2]?.finish();
    expect(settled).toHaveBeenCalledTimes(1);
    animator.finishAll();
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('finishAll jumps every tween to its end and settles once', () => {
    const { animator, resolve, animations, elements } = setup();
    const settled = vi.fn();
    animator.run([SLIDE, FADE], resolve, settled);
    animator.finishAll();
    expect(animations.map((a) => a.playState)).toEqual(['finished', 'finished']);
    expect(elements.get('d5')?.style.opacity).toBe('0');
    expect(settled).toHaveBeenCalledTimes(1);
    animator.finishAll();
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('settles once when a finish event arrives after finishAll', () => {
    const { animator, resolve } = setup();
    const settled = vi.fn();
    const late: StubAnimation[] = [];
    const el = document.createElement('div');
    el.animate = (keyframes, options) => {
      const a = new EventTarget() as unknown as StubAnimation;
      Object.assign(a, { keyframes, options, finish: () => {} });
      late.push(a);
      return a as unknown as Animation;
    };
    resolve.mockReturnValue(el);
    animator.run([SLIDE], resolve, settled);
    animator.finishAll();
    late[0]?.dispatchEvent(new Event('finish'));
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('an empty batch settles immediately without reading the frame', () => {
    const { animator, resolve, frame } = setup();
    const settled = vi.fn();
    animator.run([], resolve, settled);
    expect(settled).toHaveBeenCalledTimes(1);
    expect(frame).not.toHaveBeenCalled();
  });

  it('tweens whose element is missing are skipped; none left settles immediately', () => {
    const { animator, frame } = setup();
    const settled = vi.fn();
    animator.run([SLIDE], () => null, settled);
    expect(settled).toHaveBeenCalledTimes(1);
    expect(frame).toHaveBeenCalledTimes(1);
  });

  it('a fade-only batch does not read the frame', () => {
    const { animator, resolve, frame } = setup();
    animator.run([FADE], resolve, () => {});
    expect(frame).not.toHaveBeenCalled();
  });

  it('run interrupts the previous batch first', () => {
    const { animator, resolve, animations } = setup();
    const first = vi.fn();
    const second = vi.fn();
    animator.run([SLIDE], resolve, first);
    animator.run([ROOK], resolve, second);
    expect(first).toHaveBeenCalledTimes(1);
    expect(animations[0]?.playState).toBe('finished');
    expect(second).not.toHaveBeenCalled();
    animations[1]?.finish();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('finishAll with nothing running does nothing', () => {
    const { animator } = setup();
    expect(() => animator.finishAll()).not.toThrow();
  });
});
