import { useEffect, useState } from 'react';

export interface Viewport {
  width: number;
  height: number;
}

function read(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Window size, updated on every resize with no debounce so the breakpoint switch is immediate. */
export function useViewport(): Viewport {
  const [viewport, setViewport] = useState(read);
  useEffect(() => {
    const onResize = () => setViewport(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return viewport;
}
