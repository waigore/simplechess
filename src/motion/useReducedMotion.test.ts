import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { REDUCED_MOTION, setMediaQuery } from '../test/media';
import { useReducedMotion } from './useReducedMotion';

describe('useReducedMotion', () => {
  it('is false when the user has no preference', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('is true when reduced motion is already on', () => {
    setMediaQuery(REDUCED_MOTION, true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('follows changes to the preference and stops listening on unmount', () => {
    const { result, unmount } = renderHook(() => useReducedMotion());
    act(() => setMediaQuery(REDUCED_MOTION, true));
    expect(result.current).toBe(true);
    act(() => setMediaQuery(REDUCED_MOTION, false));
    expect(result.current).toBe(false);
    unmount();
    expect(() => setMediaQuery(REDUCED_MOTION, true)).not.toThrow();
  });
});
