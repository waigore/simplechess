import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installAnimate } from './animation';
import { installMatchMedia, resetMediaQueries } from './media';

installMatchMedia();
installAnimate();

afterEach(() => {
  cleanup();
  resetMediaQueries();
});

// jsdom has PointerEvent but no pointer capture.
const captures = new WeakMap<Element, Set<number>>();
const captured = (el: Element) => {
  let set = captures.get(el);
  if (!set) captures.set(el, (set = new Set()));
  return set;
};
Element.prototype.setPointerCapture = function (this: Element, pointerId: number) {
  captured(this).add(pointerId);
};
Element.prototype.releasePointerCapture = function (this: Element, pointerId: number) {
  captured(this).delete(pointerId);
};
Element.prototype.hasPointerCapture = function (this: Element, pointerId: number) {
  return captured(this).has(pointerId);
};
