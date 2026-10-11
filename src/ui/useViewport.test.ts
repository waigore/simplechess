import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useViewport } from './useViewport';

const original = { width: window.innerWidth, height: window.innerHeight };

function resize(width: number, height: number) {
  Object.assign(window, { innerWidth: width, innerHeight: height });
  window.dispatchEvent(new Event('resize'));
}

afterEach(() => {
  Object.assign(window, { innerWidth: original.width, innerHeight: original.height });
});

describe('useViewport', () => {
  it('reads the window size and follows resizes', () => {
    Object.assign(window, { innerWidth: 1440, innerHeight: 900 });
    const { result, unmount } = renderHook(() => useViewport());
    expect(result.current).toEqual({ width: 1440, height: 900 });

    act(() => resize(390, 844));
    expect(result.current).toEqual({ width: 390, height: 844 });

    unmount();
    resize(800, 600);
    expect(result.current).toEqual({ width: 390, height: 844 });
  });
});
