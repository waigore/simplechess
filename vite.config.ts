import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    // Full-game rules tests replay 70–100 plies through chess.js, which is slow under coverage instrumentation.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/**/*.test.{ts,tsx}', 'src/test/**'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
      reporter: ['text', 'json-summary', 'html'],
    },
  },
});
