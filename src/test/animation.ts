/** A stand-in for the Web Animations API, which jsdom lacks. It never finishes on its own; tests call `finish()`. */
export class StubAnimation extends EventTarget {
  playState: AnimationPlayState = 'running';
  constructor(
    readonly keyframes: Keyframe[],
    readonly options: KeyframeAnimationOptions,
  ) {
    super();
  }
  finish() {
    if (this.playState === 'finished') return;
    this.playState = 'finished';
    this.dispatchEvent(new Event('finish'));
  }
  cancel() {
    this.playState = 'idle';
  }
}

export function installAnimate() {
  Element.prototype.animate = function (keyframes, options) {
    const opts = typeof options === 'number' ? { duration: options } : (options ?? {});
    return new StubAnimation(keyframes as Keyframe[], opts) as unknown as Animation;
  };
}
